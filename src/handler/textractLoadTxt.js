const { TextractClient, GetDocumentAnalysisCommand } = require('@aws-sdk/client-textract');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const textract = new TextractClient({ region: 'us-east-1' });
const s3 = new S3Client({ region: 'us-east-1' });


const BUCKET_RESULTADOS = 'may-int-dev-textract-output'; // <-- AJUSTA TU BUCKET
console.log(`bucket de salida para cargar .txt ${BUCKET_RESULTADOS}`)

exports.handler = async (event) => {
  try {
    // 1. Parsear mensaje de SNS
    const snsMessage = JSON.parse(event.Records[0].Sns.Message);
    const jobId = snsMessage.JobId;
    const documentName = snsMessage.DocumentLocation?.S3ObjectName || `job-${jobId}`;

    console.log(`Procesando resultado para JobId: ${jobId} - Documento: ${documentName}`);

    // 2. Obtener todos los bloques (paginado)
    let nextToken;
    const allBlocks = [];

    do {
      const command = new GetDocumentAnalysisCommand({
        JobId: jobId,
        NextToken: nextToken,
      });

      const response = await textract.send(command);
      allBlocks.push(...response.Blocks);
      nextToken = response.NextToken;
    } while (nextToken);

    // 3. Filtrar los bloques tipo LINE (texto plano)
    const lines = allBlocks
      .filter(block => block.BlockType === 'LINE')
      .map(line => line.Text)
      .join('\n');

    // 4. Guardar como archivo .txt en S3
    const outputKey = `textract-txt/${documentName}.txt`;

    await s3.send(new PutObjectCommand({
      Bucket: BUCKET_RESULTADOS,
      Key: outputKey,
      Body: lines,
      ContentType: 'text/plain',
    }));

    console.log(`Texto plano guardado en s3://${BUCKET_RESULTADOS}/${outputKey}`);
    return { statusCode: 200, body: 'Texto extraído y guardado con éxito.' };

  } catch (error) {
    console.error('Error procesando el resultado de Textract:', error);
    return { statusCode: 500, body: 'Error interno al procesar análisis Textract.' };
  }
};