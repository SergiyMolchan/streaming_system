
const kafka = require('kafka-node');
// const topics = [{
// 	topic: 'topic-test',
// 	partitions: 100,
// 	replicationFactor: 1,
// }];
const client = new kafka.KafkaClient({ kafkaHost: '127.0.0.1:9092' });
client.createTopics(topics,(error, result) => {
	if (error) {
		console.log('topic error', error)
		return;
	}
	console.log('topic', result)
});
const producer = new kafka.Producer(client);
const consumer = new kafka.Consumer(client, [{	topic: 'topic-test' }], { autoCommit: true, fetchMaxBytes: 200000000 })
// producer.on('error', function (err) {
// 	console.log('producer error', err);
// });
//
// consumer.on('error', function (err) {
// 	console.log('consumer error', err);
// });

const ProducerStream = kafka.ProducerStream;

// const producer = new ProducerStream();

const consumerOptions = {
	kafkaHost: '127.0.0.1:9092',
	groupId: 'ExampleTestGroup',
	sessionTimeout: 15000,
	protocol: ['roundrobin'],
	asyncPush: false,
	id: 'consumer1',
	fromOffset: 'latest'
};

const consumerGroup = new kafka.ConsumerGroupStream(consumerOptions, 'topic-test');


module.exports = { producer, consumerGroup, consumer };
