const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
dotenv.config();

// The process.env property returns an object containing the user environment. 
const url = process.env.URL;

// const url = 'mongodb+srv://admin-rishi:rishi123@cluster0.e6dyod4.mongodb.net/?retryWrites=true&w=majority';

const client = new MongoClient(url);

// Database Name
const dbName = 'myProject';

async function main() {
  // Use connect method to connect to the server
  await client.connect();
  console.log('Connected successfully to server');
  const db = client.db(dbName);
  const collection = db.collection('documents');
  module.exports = client;
  
  // the following code examples can be pasted here...
  const app = require('./app');
  app.listen(process.env.PORT, ()=>{
    console.log("port runnig at 3000...");
})
  return 'done.';
}

main()
  .then(console.log)
  .catch(console.error)
  //.finally(() => client.close());<----due to this client will disconnect and dynamicaly we cant send the post requests so dont use this.