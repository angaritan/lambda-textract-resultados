const { mockClient } = require('aws-sdk-client-mock');
const { TextractClient, GetDocumentAnalysisCommand } = require('@aws-sdk/client-textract');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { handler } = require('../../handler/textractLoadTxt.js');
const { getParameter} = require('../../config/awsConfig.js');

jest.mock('../../config/awsConfig.js', () => ({
  getParameter: jest.fn()  
}));

const textractMock = mockClient(TextractClient);
const s3Mock = mockClient(S3Client);

beforeEach(() => {
  textractMock.reset();
  s3Mock.reset();
  getParameter.mockImplementation((key) => {
          const params = {
            'aws.s3.bucket-salida-textract': 'may-int-dev-textract-output',
          };
          return Promise.resolve(params[key]);
        });

});

test('procesa correctamente el mensaje SNS y guarda texto plano en S3', async () => {
  // Mock SNS Event
  const mockEvent = {
    Records: [
      {
        Sns: {
          Message: JSON.stringify({
            JobId: 'test-job-id',
            DocumentLocation: {
              S3ObjectName: 'test-document.pdf'
            }
          })
        }
      }
    ]
  };

  // Simular respuesta paginada de Textract
  textractMock
    .on(GetDocumentAnalysisCommand)
    .resolvesOnce({
      Blocks: [
        { BlockType: 'LINE', Text: 'Primera línea' },
        { BlockType: 'WORD', Text: 'No se incluye' },
        { BlockType: 'LINE', Text: 'Segunda línea' }
      ],
      NextToken: undefined
    });

  // Simular subida a S3
  s3Mock.on(PutObjectCommand).resolves({});

  const result = await handler(mockEvent);

  expect(result.statusCode).toBe(200);

  // Asegurar que PutObjectCommand fue llamado con texto plano correcto
  expect(s3Mock.calls()[0].args[0].input).toEqual({
    Bucket: 'may-int-dev-textract-output',
    Key: 'textract-txt/test-document.pdf.txt',
    Body: 'Primera línea\nSegunda línea',
    ContentType: 'text/plain'
  });
});

test('procesa múltiples páginas de bloques con paginación Textract', async () => {
  const mockEvent = {
    Records: [{
      Sns: {
        Message: JSON.stringify({
          JobId: 'job-with-pages',
          DocumentLocation: {
            S3ObjectName: 'multi-page-doc.pdf'
          }
        })
      }
    }]
  };

  textractMock
    .on(GetDocumentAnalysisCommand)
    .resolvesOnce({
      Blocks: [{ BlockType: 'LINE', Text: 'Línea 1' }],
      NextToken: 'token123'
    })
    .resolvesOnce({
      Blocks: [{ BlockType: 'LINE', Text: 'Línea 2' }],
      NextToken: undefined
    });

  s3Mock.on(PutObjectCommand).resolves({});

  const result = await handler(mockEvent);

  expect(result.statusCode).toBe(200);
  expect(s3Mock.calls()[0].args[0].input.Body).toBe('Línea 1\nLínea 2');
});

test('maneja error al obtener análisis de Textract', async () => {
  const mockEvent = {
    Records: [{
      Sns: {
        Message: JSON.stringify({
          JobId: 'fail-job',
          DocumentLocation: {
            S3ObjectName: 'fail.pdf'
          }
        })
      }
    }]
  };

  textractMock.on(GetDocumentAnalysisCommand).rejects(new Error('Textract Failed'));

  const result = await handler(mockEvent);

  expect(result.statusCode).toBe(500);
  expect(result.body).toContain('Error interno');
});

test('maneja error al guardar archivo en S3', async () => {
  const mockEvent = {
    Records: [{
      Sns: {
        Message: JSON.stringify({
          JobId: 'save-error',
          DocumentLocation: {
            S3ObjectName: 'error.pdf'
          }
        })
      }
    }]
  };

  textractMock.on(GetDocumentAnalysisCommand).resolves({
    Blocks: [{ BlockType: 'LINE', Text: 'Texto' }],
    NextToken: undefined
  });

  s3Mock.on(PutObjectCommand).rejects(new Error('S3 Save Failed'));

  const result = await handler(mockEvent);

  expect(result.statusCode).toBe(500);
});
