import bnc from 'bnc-assist'

import * as addresses from '../ducks/addresses'

let initializedAssist;

// assist methods
export const onboardUser = web3 => getAssist(web3).onboard();
export const decorateContract = contract => getAssist().Contract(contract);
export const decorateTransaction = txObject => getAssist().Transaction(txObject);

// Custom messages handler
const msgHandlers = {
  ethToTokenSwapInput: txSwapMsg,
  tokenToEthSwapInput: txSwapMsg,
  tokenToTokenSwapInput: txSwapMsg,
  ethToTokenTransferInput: txTransferMsg,
  tokenToEthTransferInput: txTransferMsg,
  tokenToTokenTransferInput: txTransferMsg,
  ethToTokenTransferOutput: txTransferMsg,
  tokenToEthTransferOutput: txTransferMsg,
  tokenToTokenTransferOutput: txTransferMsg,
  addLiquidity: txLiquidityMsg,
  removeLiquidity: txLiquidityMsg,
  createExchange: txExchangeMsg,
  approve: txApproveMsg
};

function txApproveMsg(eventCode, data) {
  const { 
    parameters,
    exchangeAddresses,
  } = getTxInfo(data);

  const token = findTicker(parameters[0], exchangeAddresses.addresses);

  switch(eventCode) {
    case 'txSent':
      return `Sending transaction to unlock ${token}`;
    case 'txPending':
      return `Your transaction to unlock ${token} is pending!`;
    case 'txConfirmed':
      return `${token} has been successfully unlocked. Woohoo!`;
    case 'txFailed':
      return `Uh oh something went wrong unlocking ${token}. Please try again later.`;
    default:
      return undefined;
  }
}

function txExchangeMsg(eventCode, data) {
  const { 
    parameters
  } = getTxInfo(data);

  const token = findTicker(parameters[0]) || 'Custom Token';

  switch(eventCode) {
    case 'txSent':
      return `Sending transaction to create ${token} exchange...`;
    case 'txPending':
      return `Your transaction to create ${token} exchange is pending!`;
    case 'txConfirmed':
      return `${token} exchange successfully created. Woohoo!`;
    case 'txFailed':
      return `Uh oh something went wrong creating ${token} exchange. Please try again later.`;
    default:
      return undefined;
  }
}

function txLiquidityMsg(eventCode, data) {
  const { 
    to,
    exchangeAddresses,
    methodName
  } = getTxInfo(data);

  const token = findTicker(to, exchangeAddresses.addresses);

  switch(eventCode) {
    case 'txSent':
      return `Sending transaction to ${methodName === 'addLiquidity' ? 'add' : 'remove'} ${token} liquidity...`;
    case 'txPending':
      return `Your transaction to ${methodName === 'addLiquidity' ? 'add' : 'remove'} ${token} liquidity is pending!`;
    case 'txConfirmed':
      return `${token} liquidity successfully ${methodName === 'addLiquidity' ? 'added' : 'removed'}. Woohoo!`;
    case 'txFailed':
      return `Uh oh something went wrong ${methodName === 'addLiquidity' ? 'adding' : 'removing'} ${token} liquidity. Please try again later.`;
    default:
      return undefined;
  }
}

function txTransferMsg(eventCode, data) {
  const { 
    methodName,
    parameters,
    to,
    exchangeAddresses,
    tokenAddresses 
  } = getTxInfo(data);

  const transfer = (function(methodName) {
    switch(methodName) {
      case 'ethToTokenTransferInput':
        return {
          token: findTicker(to, exchangeAddresses.addresses),
          to: parameters[2]
        };
      case 'tokenToEthTransferInput':
        return {
          token: 'ETH',
          to: parameters[3]
        };
      case 'tokenToTokenTransferInput':
        return {
          token: findTicker(parameters[5], tokenAddresses.addresses),
          to: parameters[4]
        };
      default:
        return {
          token: 'unknown',
          to: 'unknown'
        };
    }
  })(methodName);

  switch(eventCode) {
    case 'txSent':
      return `Sending ${transfer.token} to address: ${transfer.to.substr(0, 6)}...`;
    case 'txPending':
      return `Your ${transfer.token} transfer to address: ${transfer.to.substr(0, 6)}... is pending!`;
    case 'txConfirmed':
      return `Your ${transfer.token} transfer to address ${transfer.to.substr(0, 6)}... is complete! Woohoo!`;
    case 'txFailed':
      return `Uh oh something went wrong sending ${transfer.token} to address: ${transfer.to.substr(0, 6)}... Please try again later.`;
    default:
      return undefined;
  }
}

function txSwapMsg(eventCode, data) {
  const { 
    methodName,
    parameters,
    to,
    exchangeAddresses,
    tokenAddresses 
  } = getTxInfo(data);

  const exchange = (function(methodName) {
    switch(methodName) {
      case 'ethToTokenSwapInput':
        return {
          from: 'ETH',
          to: findTicker(to, exchangeAddresses.addresses)
        };
      case 'tokenToEthSwapInput':
        return {
          from: findTicker(to, exchangeAddresses.addresses),
          to: 'ETH'
        };
      case 'tokenToTokenSwapInput':
        return {
          from: findTicker(to, exchangeAddresses.addresses),
          to: findTicker(parameters[4], tokenAddresses.addresses)
        };
      default:
        return {
          from: 'unknown',
          to: 'unknown'
        };
    }
  })(methodName);

  switch(eventCode) {
    case 'txSent':
      return `Sending ${exchange.from} to ${exchange.to} swap request...`;
    case 'txPending':
      return `Your swap from ${exchange.from} to ${exchange.to} is pending!`;
    case 'txConfirmed':
      return `Your swap from ${exchange.from} to ${exchange.to} is complete! Woohoo!`;
    case 'txFailed':
      return `Uh oh something went wrong swapping ${exchange.from} to ${exchange.to}. Please try again later.`;
    default:
      return undefined;
  }
}

function findTicker(tokenAddress, tokenPairs) {
  return tokenPairs && tokenPairs.find(tokenPair => tokenPair[1].toLowerCase() === tokenAddress.toLowerCase())[0];
}

function getTxInfo({contract, transaction}) {
  const { methodName, parameters } = contract;
  const { to } = transaction;
  const network = process.env.REACT_APP_NETWORK_ID === '4' ? 'RINKEBY' : 'MAIN';
  const { exchangeAddresses, tokenAddresses } = addresses[network];

  return {
    methodName,
    parameters,
    to,
    exchangeAddresses,
    tokenAddresses
  };
}

// Returns initialized assist object if previously initialized.
// Otherwise will initialize assist with the config object
function getAssist(web3) {
  if (initializedAssist) {
    return initializedAssist;
  }

  const assistConfig = {
    networkId: process.env.REACT_APP_NETWORK_ID || 1,
    dappId: '12153f55-f29e-4f11-aa07-90f10da5d778',
    web3,
    messages: {
      txSent: data => msgHandlers[data.contract.methodName]('txSent', data),
      txPending: data => msgHandlers[data.contract.methodName]('txPending', data),
      txConfirmed: data => msgHandlers[data.contract.methodName]('txConfirmed', data),
      txFailed: data => msgHandlers[data.contract.methodName]('txFailed', data),
    }
  };

  initializedAssist = bnc.init(assistConfig);

  return initializedAssist;
};