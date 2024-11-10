const grpc = require('@grpc/grpc-js')
const protoLoader = require('@grpc/proto-loader')
const { getPayloadGrpc, signAndSendGrpc, sendAndExecuteGrpc } = require('./src/txService/grpcRoutes')
const { getFiatDataGrpc, getMoonpaySignatureGrpc } = require('./src/fiatDataProvider/grpcRoutes')
const { getApprovalPayloadGrpc } = require('./src/approval/grpcRoutes')
const { decodeDataGrpc } = require('./src/event/grpcRoutes')
const { getL2HashGrpc } = require('./src/txStatusService/grpcRoutes')
const { testingGrpc, testingStreamGrpc, getCountryCodeGrpc } = require('./src/grpc/grpcServer')
const { getChainGasPriceGrpc } = require('./src/gasPrice/grpcRoutes')
const { getTxEventsGrpc, getTxExecutedAmountsGrpc } = require('./src/getEventsData/grpcRoutes')

const packageDefinition = protoLoader.loadSync('SingularityGrpc.proto', { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true })
const singularityGrpcProto = grpc.loadPackageDefinition(packageDefinition).com.cerebro.proto

const server = new grpc.Server()

server.addService(singularityGrpcProto.SingularityGrpcNodeService.service, {
  GetPayload: getPayloadGrpc,
  GetFiatData: getFiatDataGrpc,
  GetApprovalPayload: getApprovalPayloadGrpc,
  SignAndSend: signAndSendGrpc,
  DecodeData: decodeDataGrpc,
  L2Info: getL2HashGrpc,
  Test: testingGrpc,
  TestStream: testingStreamGrpc,
  GetMoonpaySignature: getMoonpaySignatureGrpc,
  GetCountryCode: getCountryCodeGrpc,
  GetChainGasPrice: getChainGasPriceGrpc,
  GetTxEvents: getTxEventsGrpc,
  GetTxExecutedAmounts: getTxExecutedAmountsGrpc,
  SendAndExecute: sendAndExecuteGrpc
})

server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), (error, port) => {
  if (error) {
    console.error('Grpc Server error: ', error)
    return
  }
  console.log(`Server running on port: ${port}`)
  server.start()
})
