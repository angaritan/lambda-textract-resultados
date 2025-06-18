jest.mock('aws-sdk', () => {
    const SSM = {
      getParameter: jest.fn().mockReturnThis(),
      promise: jest.fn()
    };
 
    const S3 = {
      getObject: jest.fn().mockReturnThis(),
      promise: jest.fn()
    };
 
    const SQS = {
      getObject: jest.fn().mockReturnThis(),
      promise: jest.fn()
    };
 
    return {
      SSM: jest.fn(() => SSM),
      S3: jest.fn(() => S3),
      SQS: jest.fn(() => SQS)
    };
  });
 
  const AWS = require('aws-sdk');
  const { getParameter } = require('../../config/awsConfig.js');
 
  describe('getParameter', () => {
    it('should return parameter value', async () => {
      const mockSSM = new AWS.SSM();
      mockSSM.promise.mockResolvedValue({ Parameter: { Value: 'testValue' } });
 
      const value = await getParameter('client-id');
      expect(value).toBe('testValue');
    });
  });
