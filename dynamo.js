const AWS = require('aws-sdk');
const Promise = require('bluebird');
const constants = require('./constants');
const appConfig = require('./config').appConfig;

AWS.config.update(appConfig.dynamo);

AWS.config.setPromisesDependency(require('bluebird'));

const docClient = new AWS.DynamoDB.DocumentClient();

//responsible for addProduct, modifyProduct, viewProducts, purchaseProducts,
//productsPurchased, getRecomendations

function update(params, api) {
  return docClient.update(params).promise().then((results, err) => {
    if (!results) {
      console.log(`/${api} Dynamo Error Adding ${JSON.stringify(params.Item)} to ${params.TableName}`);
      return constants.illegalInput;
    } if (err) {
      console.log('fuck', err, 'fuck');
    }
    else {
      console.log(`/${api} success modifying dynamo : ${JSON.stringify(params)} to ${params.TableName}`);
      return(`${params.ExpressionAttributeValues} was successfully updated`);
    }
  }).catch(err => {
    console.log(`error at ${api}:\n`, err);
    return; 
  })
};
exports.update = update;

function create(params, api) {
  return docClient.put(params).promise().then(results => {
    if (!results) {
      console.log(`/${api} Dynamo Error Adding ${JSON.stringify(params.Item)} to ${params.TableName}`);
      return constants.illegalInput;
    } else {
      console.log (`/${api} success adding to dynamo: ${JSON.stringify(params)}`);
      return `${params.Item.productName} was successfully added to ${params.TableName} table`;
    }
  }).catch(err => {
    console.log(`error at ${api}:\n`, err);
    return; 
  });
};
exports.create = create;

function query(params, api) {
  return docClient.query(params).promise().then((results, err) => {
    if (!results) {
      console.log(`/${api} Dynamo Error Querying from ${params.TableName}`);
      return ({message: constants.noProducts});
    } else {
      console.log(results);
      return {product: results};
    }
  }).catch(err => {
    console.log(`error at ${api}:\n`, err);
    return; 
  });
};
exports.query = query;

function get(params, api) {
  console.log('get')
  return docClient.get(params).promise().then(results => {
    if (!results) {
      console.log(`/${api} Dynamo Error Reading from ${params.TableName}`);
      return ({message: constants.noProducts});
    } else {
      console.log('get results item\n', results.Item);
      return results.Item;
    }
  }).catch(err => {
    console.log(`error at ${api}:\n`, err);
    return; 
  });
}
exports.get = get;