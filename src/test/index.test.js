// Mock del handler real con dos escenarios: éxito y fallo controlado
jest.mock('../../src/handler/textractLoadTxt.js', () => ({
  handler: jest.fn()
}));

const { handler } = require('../../src/handler/textractLoadTxt.js');
const { lambdaHandler } = require('../../index.js');

describe('index.js', () => {
  it('should call lambda Handler and return success response', async () => {
    handler.mockResolvedValueOnce({ statusCode: 200, body: 'OK' });

    const event = {
      Records: [
        {
          Sns: {
            Message: JSON.stringify({
              JobId: 'test-job-id',
              DocumentLocation: {
                S3ObjectName: 'mock-document.pdf'
              }
            })
          }
        }
      ]
    };

    const context = { functionName: 'testFunc' };

    const result = await lambdaHandler(event, context);

    expect(result).toBeDefined();
    expect(result.statusCode).toBe(200);
    expect(result.body).toBe('OK');
  });

  it('should return 500 when handler fails internally', async () => {
    handler.mockResolvedValueOnce({
      statusCode: 500,
      body: 'Error interno al procesar análisis Textract.'
    });

    const event = {
      Records: [
        {
          Sns: {
            Message: JSON.stringify({
              JobId: 'error-job-id',
              DocumentLocation: {
                S3ObjectName: 'fail.pdf'
              }
            })
          }
        }
      ]
    };

    const context = { functionName: 'testFunc' };

    const result = await lambdaHandler(event, context);

    expect(result).toBeDefined();
    expect(result.statusCode).toBe(500);
    expect(result.body).toContain('Error interno');
  });
});