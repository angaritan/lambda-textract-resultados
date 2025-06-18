const AWS = require('aws-sdk');

const s3 = new AWS.S3();
const sqs = new AWS.SQS();
const ssm = new AWS.SSM();

const getParameter = async(nameParameter) => {
    const result = await ssm.getParameter({
        Name: `/textract-load/configuration/${nameParameter}`,
        WithDecryption: false,
    }).promise();

    return result.Parameter.Value;
};

module.exports = {
    getParameter,
    s3,
    sqs
};