// import { request } from 'http';

var lineReader = require('line-reader');
var AWS = require("aws-sdk");
var constants = require('./constants');
var appConfig = require('./config').appConfig;
var Promise = require('bluebird');

AWS.config.update(appConfig.dynamoScott);
AWS.config.setPromisesDependency(require('bluebird'));

var already = false;
var categories = false;
 

var DynamoDB = new AWS.DynamoDB.DocumentClient();


// var params = {
//     RequestItems: {
//         'products': [

//         ]
//     }
// }

var params = {};
var jsonObject;

requestItems = {'Products': []};                  

count = 0;
batchSize = 20;
lineReader.eachLine('ProductRecords.json', function(line, last) {
    currentLine = line.toString().replace(/'/g, "\"", "g");
    try {
      singleRequest = {'PutRequest': {}}
  
      jsonObject = JSON.parse(currentLine);
  
       console.log(jsonObject)
  
      Item = {}
      Item.asin = jsonObject.asin;
      if(jsonObject.categories == "")
      {
        Item.productGroup = " ";
      }
      else
      {
        Item.productGroup = jsonObject.categories[0][0];
      }
      if(jsonObject.description == "")
      {
        Item.productDescription = "no description";
      }
      else
      {
        Item.productDescription = jsonObject.description;
      }
      Item.productName = jsonObject.title;
  
      singleRequest.PutRequest.Item = Item;
  
      requestItems.Products.push(singleRequest);
      count++;
      
      if(count == batchSize)
      {
        params = {}
        params.RequestItems = requestItems;
          DynamoDB.batchWrite(params, function(err, data) {
              if (err){
                setTimeout(DynamoDB.batchWrite(params), 200);
                DynamoDB.batchWrite(params);
                console.log("******* BADBADBADBADBADBAD ******BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB*", err);
              } else {
                console.log("things are still ok");
              }
          requestItems = {'Products': []};                  
          console.log("things are ok");
          // setTimeout({}, 10);
          count = 0;
        })
      }
    }
    catch(err) {
        console.log("!!!!!!!!!!!!!BAD!!!!!!!!!!!!!!!", err)
        console.log("this is the bad line", currentLine);
    }


    
    

    // params.RequestItems.products.PutRequest = {};
    // params.RequestItems.products.PutRequest.Item = Item;

    // if(count == batchSize)
    // {
    //     DynamoDB.batchWrite(params, function(err, data) {
    //         if (err) console.log(err);
    //         else return;
    //       });
    // }

    // if(count == 1)
    // {
    //     console.log(Item);
    //     return;
    // }

    // console.log(jsonObject.asin);
 
});

// params.RequestItems = requestItems;
// console.log(params);





// var params = {
//     RequestItems: { /* required */
//       '<TableName>': [
//         {
//           DeleteRequest: {
//             Key: { /* required */
//               '<AttributeName>': someValue /* "str" | 10 | true | false | null | [1, "a"] | {a: "b"} */,
//               /* '<AttributeName>': ... */
//             }
//           },
//           PutRequest: {
//             Item: { /* required */
//               '<AttributeName>': someValue /* "str" | 10 | true | false | null | [1, "a"] | {a: "b"} */,
//               /* '<AttributeName>': ... */
//             }
//           }
//         },
//         /* more items */
//       ],
//       /* '<TableName>': ... */
//     },
//     ReturnConsumedCapacity: INDEXES | TOTAL | NONE,
//     ReturnItemCollectionMetrics: SIZE | NONE
//   };

function delay(time) {
  return new Promise(resolve => {
    console.log('delay')
    setTimeout(resolve, time)
  });
}