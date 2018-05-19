const express = require('express');
const constants = require('./constants');
const mysqlManager = require('./mysql');
const session = require('client-sessions');
const app = express();
const appConfig = require('./config').appConfig;
const Promise = require('bluebird');
const bodyParser = require('body-parser');
const dynamoHelper = require('./dynamo');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  cookieName: 'session',
  secret: 'keyboard cat',
  duration:1800000,
  activeDuration: 900000
}));

const auth = function (req, res, next) {
  if (req.session && req.session.user) {
    return next();
  } else {
    console.log('auth: not logged in', req.route.path);
    return res.json({message: constants.noLogin});
  }
}

function registerCheck(body) {
  console.log("reqBody", constants.userInfo.length);
  if (!body.fname || !body.lname || !body.address || !body.city || 
  !body.state || !body.zip || !body.email || !body.username ||
  !body.password) {
    console.log("failed register missing something");
    return false;
  }
  return true;
};

app.post('/healthCheck', function(req, res) {
  console.log('health check');
  res.sendStatus(200);
});

app.get('/healthCheck', function(req, res) {
  console.log('healthCheck');
  res.sendStatus(200);
});

app.post('/registerUser', function(req, res) {
  let body = req.body;
  if (!registerCheck(body)) {
    console.log(`/registerUser illegalInput: ${JSON.stringify(body)}`);
    res.json({message: constants.illegalInput});
    return;
  }
  return Promise.using(mysqlManager.getSqlConnection(), connection => {
    return connection.queryAsync(
      `INSERT INTO users (fname, lname, address, city, state, zip, email, username, password, admin) VALUES ('${body.fname}', '${body.lname}', '${body.address}', '${body.city}', '${body.state}', '${body.zip}', '${body.email}', '${body.username}', '${body.password}', 0)`
    );
  }).then(results => {
    if (!results || results.length === 0) {
      console.log(`/registerUser mysqlError`);
      throw {message: constants.illegalInput};
    } else {
      console.log(`/registerUser ${body.fname} was registered successfully`);
      return res.json({message: `${body.fname} was registered successfully`});
    }
  }).catch(err => {
    console.log(`/registerUser ${JSON.stringify(body)}`);
    return res.json({message: constants.illegalInput});
  });
});

app.post('/login', function(req, res) {
  if (req.session && req.session.user) {
    req.session.destroy();
  }
  console.log(`/login body: ${JSON.stringify(req.body)}`);
  let username = req.body.username;
  let password = req.body.password;
  if (!username || !password) {
    console.log(`/login loginIssue: ${JSON.stringify(body)}`);
    return res.json({message: constants.loginIssue});
  }
  return Promise.using(mysqlManager.getSqlConnection(), connection => {
    return connection.queryAsync(
      'SELECT * FROM users WHERE username = "' + username + '" AND password = "' + password + '"', [username, password]
    );
  }).then(results => {
    if (!results || results.length === 0) {
      console.log(`/login mySQL error`);
      return res.json({message: constants.loginIssue});
    } else {
      console.log(`/login success user: \n${JSON.stringify(results)}`);
      req.session.user = username;
      req.session.fname = results[0].fname;
      if (results[0].admin === 1) {
        req.session.admin = true;
      } else {
        req.session.admin = false;
      }
      return res.json({message: `Welcome ${results[0].fname}`});
    }
  });
});

app.post('/logout', function(req, res) {
  if (req.session && req.session.user) {
    req.session.destroy();
    console.log("/logout success");
    return res.json({message: constants.logout});
  } else {
    console.log(`/logout not logged in`);
    return res.json({message: constants.noLogin});
  }
});

app.post('/updateInfo', auth, function(req, res) {
  let body = req.body;
  if (!req.session || !req.session.user) {
    console.log("/updateInfo not logged in")
    return res.json({message: constants.noLogin});
  }
  let query = "UPDATE users SET ";
  let valArr = [];
  let changeName = false;
  if (body.fname) {
    query+="fname=?, ";
    valArr.push(body.fname);
    changeName = true;
  }
  if (body.lname) {
    query+="lname=?, ";
    valArr.push(body.lname);
  }
  if (body.address) {
    query+="address=?, ";
    valArr.push(body.address);
  }
  if (body.city) {
    query+="city=?, ";
    valArr.push(body.city);
  }
  if (body.state) {
    query+="state=?, ";
    valArr.push(body.state);
  }
  if (body.zip) {
    query+="zip=?, ";
    valArr.push(body.zip);
  }
  if (body.email) {
    query+="email=?, ";
    valArr.push(body.email);
  }
  if (body.password) {
    query+="password=? ";
    valArr.push(body.password);
  }
  //if , at the end cut it out and add but the space
  if (query[query.length - 2] === ","){
    query = query.slice(0, query.length - 2);
    query += " ";
  }
  if (valArr.length !== 0) {
    query += "WHERE username='" + req.session.user + "'";
  } else {
      console.log(`/updateInfo success for ${req.session.user}`);
      return res.json({message: req.session.fname + " your information was successfully updated"});
  }
  console.log(`/updateInfo mySQL query: ${query}`);
  return Promise.using(mysqlManager.getSqlConnection(), connection=> {
    return connection.queryAsync(
      query,
      valArr
    );
  }).then(results => {
    if (!results) {
      console.log(`/updateInfo illegalInput: ${JSON.stringify(body)}`);
      return res.json({message: constants.illegalInput});
    } else {
      console.log(`/updateInfo ${req.session.fname}'s info was successfully updated`);
      if (changeName) {
        req.session.fname = body.fname;
      }
      return res.json({message: req.session.fname + " your information was successfully updated"});
    }
  });
});

app.post('/addProducts', auth, function(req, res) {
  let body = req.body;
  if (!req.session || !req.session.user) {
    console.log("/addProducts not logged in")
    return res.json({message: constants.noLogin});
  }
  if (!req.session.admin) {
    console.log(`/addProducts not Admin`);
    return res.json({message: constants.notAdmin});
  }
  if (!body.asin || !body.productName || !body.productDescription || !body.group) {
    console.log(`/addProducts illegalInput: ${JSON.stringify(body)}`);
    return res.json({message: constants.illegalInput});
  }
  let asin = body.asin;
  let params = {
    TableName: appConfig.dynamoTables.productTable,
    Item:{
      "asin": body.asin,
      "productGroup": body.group,
      "productName": body.productName,
      "productDescription": body.productDescription,
    }
  };
  return dynamoHelper.create(params, `addProducts`).then(results => {
    if (!results) {
      console.log(`/addProducts dynamo error`);
      return res.json({message: constants.illegalInput});
    } else {
      res.json({message: results});
      return Promise.using(mysqlManager.getSqlConnection(), connection=> {
        return connection.queryAsync("INSERT INTO products (asin, productName, productDescription, productGroup) VALUES (?,?,?,?)", [body.asin, body.productName, body.productDescription, body.group]);
      }).then(results => {
        if (!results || results.length === 0) {
          console.log(`/addProduct mySQL error`);
          return;
        } else {
          console.log (`/addProduct mysql success ${results}`);
          return;
        }
      })
    }
  });
});

app.post('/modifyProduct', auth, function(req, res) {
  let body = req.body;
  if (!req.session || !req.session.user) {
    console.log("/modifyProduct not logged in")
    return res.json({message: constants.noLogin});
  }
  if (!req.session.admin) {
    console.log(`/modifyProduct not admin`);
    return res.json({message: constants.notAdmin});
  }
  if (!body.asin || !body.productName || !body.productDescription || !body.group) {
    console.log(`/modifyProduct illegalInput: ${JSON.stringify(body)}`)
    res.json({message: constants.illegalInput});
    return;
  }
  let params = {
    TableName: appConfig.dynamoTables.productTable,
    Key: {
      "asin": body.asin,
    },
    UpdateExpression: "set productGroup=:g, productName=:n, productDescription=:d",
    ExpressionAttributeValues:{
      ":g": body.group,
      ":n": body.productName,
      ":d": body.productDescription
    },
    ReturnValues:"UPDATED_NEW"
  };
  return dynamoHelper.update(params, "modifyProduct").then(results => {
    if (!results) {
      console.log(`/modifyProduct dynamo error`);
      return res.json({message: constants.illegalInput});
    } else {
      console.log(`/modifyProduct dynamo success`);
      res.json({message: `${body.productName} was successfully updated`});
      return Promise.using(mysqlManager.getSqlConnection(), connection => {
        return connection.queryAsync(
          "UPDATE products SET productName=?, productDescription=?, productGroup=? WHERE asin=?",
          [body.productName, body.productDescription, body.group, body.asin]
        );
      }).then(results => {
        if (!results || results.affectedRows < 1) {
          console.log(`/modifyProduct illegalInput: ${body}`);
          return;
        } else {
          console.log(`/modifyProduct ${body.productName} was successfully modified in mysql`);
          return;
        }
      });
    }
  })
});

app.post('/viewUsers', auth, function(req, res) {
  let body = req.body;
  if (!req.session || !req.session.user) {
    console.log("/viewUsers not logged in");
    return res.json({message: constants.noLogin});
  }
  if (!req.session.admin) {
    console.log("/viewUsers not Admin");
    return res.json({message: constants.notAdmin});
  }
  let query = "SELECT fname, lname, username from users";
  if (body.fname || body.lname) {
    query += " WHERE";
  }
  let valArr =[];
  if (body.fname) {
    query += ` fname LIKE '%${body.fname}%'`;
    valArr.push(body.fname);
  }
  if (body.lname) {
    if (valArr.length === 0) {
      query += ` lname LIKE '%${body.lname}%'`;
    } else {
      query += ` AND lname LIKE '%${body.lname}%'`;
      //query += " AND lname LIKE %?%";
    }
    valArr.push(body.lname);
  }
  return Promise.using(mysqlManager.getSqlConnection(), connection => {
    return connection.queryAsync(query, valArr)
  }).then(results => {
    if (!results || results.length === 0) {
      console.log(`/viewUsers error`);
      return res.json({message: "There are no users that match that criteria"});
    } else {
      for (let i = 0; i < results.length; i++) {
        if (results[i] && results[i].username) {
          results[i].userId = results[i].username;
          delete results[i].username;
        }
      }
      console.log(`/viewUsers success: ${JSON.stringify(results)}`);
      return res.json({message: "The action was successful", user: results});
    }
  })
});

app.post('/viewProducts', function(req, res) {
  let body = req.body;
  let query = "SELECT asin, productName FROM products";
  if (body.asin || body.keyword || body.group) {
    query += " WHERE";
  }
  let valArr = [];
  if (body.asin) {
    query += ` asin='${body.asin}'`;
    valArr.push(body.asin);
  }
  if (body.group) {
    if (valArr.length === 0) {
      query += ` productGroup='${body.group}'`;
    } else {
      query += ` AND productGroup='${body.group}'`;
    }
    valArr.push(body.group);
  }
  if (body.keyword) {
    if (valArr.length === 0) {
      query += ` productName LIKE '%${body.keyword}%' OR productDescription LIKE '%${body.keyword}%'`;
      valArr.push(body.keyword);
    } else {
      query += ` AND productName LIKE '%${body.keyword}%' OR productDescription LIKE '%${body.keyword}%'`;
    }
  }
  return Promise.using(mysqlManager.getSqlConnection(), connection => {
    return connection.queryAsync(query, valArr)
  }).then(results => {
    console.log(results.length)
    if (!results || results.length === 0){
      console.log(`/viewProducts error`);
      return res.json({message: constants.noProducts});
    } else {
      console.log(`/viewProducts success for query ${query}`)
      return res.json({product: results});
    }
  })
});

app.post('/buyProducts', auth, function(req, res) {
  let body = req.body;
  if (!req.session || !req.session.user) {
    console.log('/buyProducts not logged in');
    return res.json({message: constants.noLogin});
  }
  if (!body.products) {
    console.log('/buyProducts no products given')
    return res.json({message: constants.noProducts});
  }
  let productParam = {};
  body.products.forEach(function(p) {
    if (productParam.hasOwnProperty(p)) {
      productParam[p] += 1;
    } else {
      productParam[p] = 1;
    }
  })
  let params = {
    TableName: appConfig.dynamoTables.productPurchaseTable,
    Key: {
      "username": req.session.user
    }
  };
  console.log('before the buy get')
  return dynamoHelper.get(params, 'buyProducts').then(results => {
    console.log(results, 'after first get purchased');
    if (results) {
      productParam = results.productAsin;
      console.log('productParam', productParam, body.products)
      return Promise.map(body.products, function(p) {
        if (productParam.hasOwnProperty(p)) {
          productParam[p] += 1;
        } else {
          productParam[p] = 1;
        }
        return;
      }).then( () => {
        let params2 = {
          TableName: appConfig.dynamoTables.productPurchaseTable,
          Key: {
            "username": req.session.user
          },
          UpdateExpression: "set productAsin=:a",
          ExpressionAttributeValues: {
            ":a": productParam
          }
        }
        return dynamoHelper.update(params2, 'buyProducts').then(results => {
          console.log(results);
          if (!results) {
            return res.json({message: constants.noProducts});
          } else {
            res.json({message: constants.success})
            return getPurchase(body);
          }
        });
      })
    } else {
      let params2 = {
        TableName: appConfig.dynamoTables.productPurchaseTable,
        Item: {
          "username": req.session.user,
          "productAsin": productParam
        }
      };
      return dynamoHelper.create(params2, 'buyProducts').then(results => {
        console.log(results);
        if (!results) {
          return res.json({message: constants.noProducts})
        }
        res.json({message: constants.success});
        return getPurchase(body);
      })
    }
  })
});

function getPurchase(body) {
  let productArr = body.products;
  let promises = [];
  let params = {
    TableName: appConfig.dynamoTables.productTable
  };
  let prodObj = {};
  productArr.forEach(function(p) {
    params.Key = {
      "asin": p
    };
    promises.push(
      dynamoHelper.get(params, 'buyProducts').then(results => {
        if (!results || !results.asinPurchased || !results.asinPurchased.asinPurchased) {
          prodObj = {};
        } else {
          prodObj = results.asinPurchased.asinPurchased;
        }
        console.log("prodObj", prodObj)
        productArr.forEach(function(prod) {
          if (prod != p) {
            if (prodObj.hasOwnProperty(prod)) {
              prodObj[prod] += 1;
            } else {
              prodObj[prod] = 1;
            }
          }
        })
        return modifyBuy(p, prodObj, '/buyProducts');
      })
    );
  })
  return Promise.all(promises);
};

function modifyBuy(asin, aPurchased, api) {
  console.log('apurchased', aPurchased);
  let params = {
    TableName: appConfig.dynamoTables.productTable,
    Key: {
      "asin": asin,
    },
    UpdateExpression: "set asinPurchased=:a",
    ExpressionAttributeValues:{
      ":a": {"asinPurchased": aPurchased}
    },
    ReturnValues:"UPDATED_NEW"
  };
  return dynamoHelper.update(params, api).then(results => {
    if (!results) {
      console.log(`${api} modify buy dynamo error`);
    } else {
      console.log(`${api} modify buy dynamo success`);
    }
  })
};

app.post('/productsPurchased', auth, function(req, res) {
  let body = req.body;
  if (!req.session || !req.session.user) {
    console.log('/buyProducts not logged in');
    return res.json({message: constants.noLogin});
  }
  if (!body.username) {
    console.log('/buyProducts no username given')
    return res.json({message: constants.noUsers});
  }
  if (!req.session.admin) {
    console.log("/viewUsers not Admin");
    return res.json({message: constants.notAdmin});
  }
  let params = {
    TableName: appConfig.dynamoTables.productPurchaseTable,
    Key: {
      "username": body.username
    }
  };
  return dynamoHelper.get(params, 'productsPurchased').then(results => {
    let promises = [];
    let response = [];
    let params = {
      TableName: appConfig.dynamoTables.productTable
    };
    let lookup = results.productAsin;
    console.log("looooook", lookup)
    Object.keys(results.productAsin).forEach(function(key) {
      params.Key = {
        "asin": key
      };
      promises.push(
        dynamoHelper.get(params, 'productsPurchased').then(results => {
          response.push(
            {
              "productName": results.productName,
              "quantity": lookup[key]
            }
          )
        })
      );
    });
    return Promise.all(promises).then(() => {
      return res.json({message: constants.success, products: response})
    })
  });
});

app.post('/getRecommendations', auth, function(req, res) {
  let body = req.body;
  if (!req.session || !req.session.user) {
    console.log('/buyProducts not logged in');
    return res.json({message: constants.noLogin});
  }
  let params = {
    TableName: appConfig.dynamoTables.productTable,
    Key: {
      "asin": body.asin
    }
  };
  let purchaseArr = [];
  return dynamoHelper.get(params, 'getRecommendations').then(results => {
    if (!results || !results.asinPurchased) {
      console.log('/getRecommendations no asinPurchased');
      return res.json({message: "There are no recommendations for that product"});
    } else {
      let ap = results.asinPurchased.asinPurchased;
      for (a in ap){
        purchaseArr.push([a, ap[a]])
      }
      purchaseArr.sort(function(a,b){return b[1] - a[1]});
      purchaseArr = purchaseArr.slice(0,5);
      console.log(purchaseArr);
      let prod = [];
      purchaseArr.forEach(function(a) {
        prod.push({"asin": a[0]})
      })
      return res.json({message: constants.success, products: prod})
    }
  });
});

app.listen(4000, function() {
  console.log("app listening on port 4000");
});
