let mysqlConfig = {};

const appConfig = {
  "mysql": {
    "host": "project4.crqdskclhkog.us-east-1.rds.amazonaws.com",
    "user": "root",
    "password": "password",
    "database": "proj4"
  },
  "dynamo": {
    "region": "us-east-1",
    "accessKeyId": "AKIAIFKRYYQTXHKQ6UAQ",
    "secretAccessKey": "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"
  },
  "dynamoScott": {
    "region": "us-east-1",
    "accessKeyId": "AKIAIQJAMNSWM6MRX3XA",
    "secretAccessKey": "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"
  },
  "dynamoTables": {
    "productTable": "Products",
    "productPurchaseTable": "productPurchase"
  }
};

exports.appConfig = appConfig;