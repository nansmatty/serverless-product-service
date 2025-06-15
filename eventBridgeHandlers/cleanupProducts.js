const { DynamoDBClient, ScanCommand, DeleteItemCommand } = require('@aws-sdk/client-dynamodb');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');

const dynamoDbClient = new DynamoDBClient({ region: process.env.REGION });
const snsClient = new SNSClient({ region: process.env.REGION });

exports.cleanupProducts = async (event) => {
	try {
		const tableName = process.env.PRODUCTS_TABLE;
		const snsTopicArn = process.env.SNS_TOPIC_ARN;

		// Calculate the timestamp for one hour ago
		const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

		// Scan the DynamoDB table to get all products
		const scanCommand = new ScanCommand({
			TableName: tableName,
			FilterExpression: 'createdAt < :oneHourAgo AND attribute_not_exists(imageUrl)',
			ExpressionAttributeValues: {
				':oneHourAgo': { S: oneHourAgo },
			},
		});

		// Execute the scan command to retrieve products older than one hour without an imageURL from database
		const { Items } = await dynamoDbClient.send(scanCommand);

		if (!Items || Items.length === 0) {
			return {
				statusCode: 200,
				body: JSON.stringify({ message: 'No products to clean up.' }),
			};
		}

		// Initialize a counter to track the number of deleted products
		let deletedCount = 0;

		// Iterate over the items and delete each one
		for (const item of Items) {
			const deleteItemCommand = new DeleteItemCommand({
				TableName: tableName,
				Key: {
					id: { S: item.id.S }, // Assuming id is the primary key or partition key
				},
			});

			await dynamoDbClient.send(deleteItemCommand);
			deletedCount++;
		}

		// Publish a message to SNS about the cleanup
		const snsMessage = `Product cleanup notification from subscribed SNS Topic. ${deletedCount} products older than one hour without an imageURL have been deleted.`;

		const publishCommand = new PublishCommand({
			TopicArn: snsTopicArn,
			Message: snsMessage,
			Subject: 'Product Cleanup Notification',
		});

		await snsClient.send(publishCommand);

		return {
			statusCode: 200,
			body: JSON.stringify({ message: `${deletedCount} products cleaned up successfully.` }),
		};
	} catch (error) {
		return {
			statusCode: 500,
			body: JSON.stringify({ error: 'Failed to clean up products.', details: error.message }),
		};
	}
};
