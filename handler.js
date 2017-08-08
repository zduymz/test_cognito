'use strict';

var windowmock = require('window-mock');
global.window = {
  localStorage: new windowmock.default().localStorage
};
global.navigator = () => null;
var Promise = require('bluebird');
const AmazonCognitoIdentity = require('amazon-cognito-identity-js');
const config = require('./config')

const poolData = {
  UserPoolId: config.userPoolId,
  ClientId: config.clientId
};

const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

const getTokenUser = (context, callback, userID) => {
  var userData = {
    Username: userID,
    Pool: userPool
  };
  var authenticationData = {
    Username: userID,
    Password: config.newPassword,
  };
  var authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails(authenticationData);
  var cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
  cognitoUser.authenticateUser(authenticationDetails, {
    onSuccess: function(result) {
      // console.log(result);
      const response = {
        statusCode: 200,
        body: result.getAccessToken().getJwtToken(),
      };
      callback(null, response);
    },

    onFailure: function(err) {
      console.log(err);
    }
  });
};

const changePasswordUser = (userID) => {
  var userData = {
    Username: userID,
    Pool: userPool
  };
  var authenticationData = {
    Username: userID,
    Password: config.oldPassword,
  };
  var authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails(authenticationData);
  var cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);


  return new Promise(function() {
    cognitoUser.authenticateUser(authenticationDetails, {
      onSuccess: function(result) {
        console.log("onSuccess");
      },

      onFailure: function(err) {
        console.log(err);
      },

      mfaRequired: function(codeDeliveryDetails) {
        console.log("MFA is required to complete user authentication.");
      },

      newPasswordRequired: function(userAttributes, requiredAttributes) {
        delete userAttributes.email_verified;
        cognitoUser.completeNewPasswordChallenge(config.newPassword, userAttributes, this);
      }
    });
  });
};

function getTokenHandler(proxyEvent, context, callback) {
  const userID = proxyEvent.pathParameters.userID;
  changePasswordUser(userID).then(function() {
    getTokenUser(context, callback, userID);
  });
}

module.exports.getToken = (event, context, callback) => getTokenHandler(event, context, callback);