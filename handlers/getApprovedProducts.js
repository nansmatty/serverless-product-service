const { DynamoDBClient, ScanCommand } = require('@aws-sdk/client-dynamodb');

const dynamoDbClient = new DynamoDBClient({ region: process.env.REGION });

exports.getProducts = async (event) => {
	try {
		const tableName = process.env.PRODUCTS_TABLE;

		// Scan the DynamoDB table to get all products
		const scanCommand = new ScanCommand({
			TableName: tableName,
			FilterExpression: 'attribute_exists(imageUrl) AND isApproved = :isApproved',
			ExpressionAttributeValues: {
				':isApproved': { BOOL: true }, // Assuming isApproved is a boolean attribute
			},
		});

		// Execute the scan command to retrieve all products from the database
		const { Items } = await dynamoDbClient.send(scanCommand);

		// Convert the DynamoDB items to a more readable format
		// const products = Items.map((item) => ({
		// 	id: item.id,
		// 	name: item.name,
		// 	price: parseFloat(item.price.N),
		// 	imageUrl: item.imageUrl,
		// 	createdAt: item.createdAt,
		// }));

		return {
			statusCode: 200,
			body: JSON.stringify({ products: Items }),
		};
	} catch (error) {
		return {
			statusCode: 500,
			body: JSON.stringify({ error: 'Failed to retrieve products.', details: error.message }),
		};
	}
};
