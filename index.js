//console.clear();
require("dotenv").config();
const {
    AccountId,
    PrivateKey,
    Client,
    FileCreateTransaction,
    ContractCreateTransaction,
    ContractFunctionParameters,
    ContractExecuteTransaction,
    ContractCallQuery,
    Hbar,
} = require("@hashgraph/sdk");
const fs = require("fs");

//configure accounts and client
const operatorId = AccountId.fromString(process.env.ACCOUNT_ID);
const operatorKey = PrivateKey.fromString(process.env.PRIVATE_KEY);
const client = Client.forTestnet().setOperator(operatorId, operatorKey);
async function main() {
    //import the compile contract bytecode
    const contractByteCode = fs.readFileSync("LookupContract_sol_LookupContract.bin");

    //create a file on hedera and store the bytecode
    const fileCreateTx = new FileCreateTransaction()
        .setContents(contractByteCode)
        .setKeys([operatorKey])
        .setMaxTransactionFee(new Hbar(3))
        .freezeWith(client);
    const fileCreateSign = await fileCreateTx.sign(operatorKey);
    const fileCreateSubmit = await fileCreateSign.execute(client);
    const fileCreateRx = await fileCreateSubmit.getReceipt(client);
    const bytecodeFileId = fileCreateRx.fileId;
    console.log(`- The bytecode file ID is: ${bytecodeFileId} \n`);
    //instantiate the smart contract
    const contractInstantiateTx = new ContractCreateTransaction()
        .setBytecodeFileId(bytecodeFileId)
        .setGas(100000)
        .setConstructorParameters(new ContractFunctionParameters().addString("Alice").addUint256(111111));
    const contractInstantiateSubmit = await contractInstantiateTx.execute(client);
    const contractInstantiateRx = await contractInstantiateSubmit.getReceipt(client);
    const contractId = contractInstantiateRx.contractId;
    const contractAddress = contractId.toSolidityAddress();
    console.log(`- The smart contract ID is: ${contractId} \n`);
    console.log(`- The smart contract ID in Solidity format is: ${contractAddress} \n`);
    
    //query the contract to check changes in state variable
    const contractQueryTx = new ContractCallQuery()
        .setContractId(contractId)
        .setGas(100000)
        .setFunction("getMobileNumber", new ContractFunctionParameters().addString("Alice"))
        .setMaxQueryPayment(new Hbar(1));
    const contractQuerySubmit = await contractQueryTx.execute(client);
    const contractQueryResult = contractQuerySubmit.getUint256(0);
    console.log(`- Here's the phone number that you asked for: ${contractQueryResult} \n`);
    
    //call contract function to update the state variable
    const contractExecuteTx = new ContractExecuteTransaction()
    .setContractId(contractId)
    .setGas(100000)
    .setFunction("setMobileNumber", new ContractFunctionParameters().addString("Bob").addUint256(2222))
    .setMaxTransactionFee(new Hbar(0.75));
    const contractExecuteSubmit = await contractExecuteTx.execute(client);
    const contractExecuteRx = await contractExecuteSubmit.getReceipt(client);
    console.log(`- Contract function call satus: ${contractExecuteRx.status} \n`);
    

    //query the contract to check changes in state variable
    const contractQueryTx1 = new ContractCallQuery()
        .setContractId(contractId)
        .setGas(100000)
        .setFunction("getMobileNumber", new ContractFunctionParameters().addString("Bob"))
        .setMaxQueryPayment(new Hbar(1));
    const contractQuerySubmit1 = await contractQueryTx1.execute(client);
    const contractQueryResult1 = contractQuerySubmit1.getUint256(0);
    console.log(`- Here's the phone number that you asked for: ${contractQueryResult1} \n`);
}

main()