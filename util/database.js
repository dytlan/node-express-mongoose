const mongoDb = require('mongodb');

const mongoClient = mongoDb.MongoClient;

let _db;

const mongoConnect = callback => {
    mongoClient.connect('mongodb+srv://devalpha:jajamiharja123@cluster0.wdmus.mongodb.net/shop?retryWrites=true&w=majority')
        .then(client => {
            console.log('Connected!')
            _db = client.db('shop');
            callback();
        })
        .catch (err => {
            console.log(err);
            throw err;
        });
}

const getDb = ()=>{
    if(_db){
        return _db;
    }
    throw "No database found!";
}

exports.mongoConnect = mongoConnect;
exports.getDb = getDb;