const { DynamoDBClient, UpdateItemCommand, ScanCommand } = require('@aws-sdk/client-dynamodb');

const dynamoDbClient = new DynamoDBClient({ region: process.env.REGION });

exports.updateProductData = async (event) => {
	try {
		const tableName = process.env.PRODUCTS_TABLE;
		const bucketName = process.env.PRODUCT_BUCKET_NAME;

		// Extract file details from s3 event notification
		const record = event.Records[0];

		// Extract the file name from the S3 event record
		const fileName = record.s3.object.key;

		const imageUrl = `https://${bucketName}.s3.amazonaws.com/${fileName}`;

		// Scan the Record using fileName and get the product ID
		const scanCommand = new ScanCommand({
			TableName: tableName,
			FilterExpression: 'fileName = :fileName',
			ExpressionAttributeValues: {
				':fileName': { S: fileName },
			},
		});

		const scanResult = await dynamoDbClient.send(scanCommand);

		if (!scanResult.Items || scanResult.Items.length === 0) {
			return {
				statusCode: 404,
				body: JSON.stringify({ error: 'Product not found for the given fileName.' }),
			};
		}

		const updateItemCommand = new UpdateItemCommand({
			TableName: tableName,
			Key: { id: { S: scanResult.Items[0].id.S } },
			UpdateExpression: 'SET imageUrl = :imageUrl', //update only the image url field
			ExpressionAttributeValues: {
				':imageUrl': { S: imageUrl }, //Assign the new image url
			},
		});

		await dynamoDbClient.send(updateItemCommand);
		return {
			statusCode: 200,
			body: JSON.stringify({
				message: 'Product image updated successfully.',
			}),
		};
	} catch (error) {
		return {
			statusCode: 500,
			body: JSON.stringify({ error: 'Failed to update product image.', details: error.message }),
		};
	}
};
