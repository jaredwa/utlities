/* A Chunk Uploader for React */

import * as fs from 'fs'
import formidable from 'formidable'

export const config = {
	api: {
		bodyParser: false
	}
}

export default async function chunkedFiles(req, res) {
	const maxSize = 1024 * 1024 * 10,
		form = formidable({ maxFileSize: maxSize, allowEmptyFiles: true, minFileSize: 0 }),
		mergeChunks = async (fileName, totalChunks) => {
			const chunkDir =  '/tmp/chunks'
			const mergedFilePath = '/tmp/merged_files'

			if (!fs.existsSync(mergedFilePath)) {
				fs.mkdirSync(mergedFilePath)
			}

			const writeStream = fs.createWriteStream(`${mergedFilePath}/${fileName}`)
			for (let i = 0; i < totalChunks; i++) {
				const chunkFilePath = `${chunkDir}/${fileName}.part_${i}`
				const chunkBuffer = await fs.promises.readFile(chunkFilePath)
				writeStream.write(chunkBuffer)
				fs.unlinkSync(chunkFilePath) // Delete the individual chunk file after merging
			}

			writeStream.end()
			console.log('Chunks merged successfully')
		}

	let rawFields,
		fields = {},
		files

	[rawFields, files] = await form.parse(req)

	Object.keys(rawFields).forEach(key => {
		fields[key] = rawFields[key][0]
	})
	console.log( JSON.stringify(files?.file[0].filepath) )



	const file = files?.file?.[0]
	const chunk = file
	const chunkNumber = Number(fields.chunkNumber) // Sent from the client
	const totalChunks = Number(fields.totalChunks) // Sent from the client
	const fileName = fields.originalname

	const chunkDir = '/tmp/chunks' // Directory to save chunks

	if (!fs.existsSync(chunkDir)) {
		fs.mkdirSync(chunkDir)
	}

	const chunkFilePath = `${chunkDir}/${fileName}.part_${chunkNumber}`

	try {
		await fs.promises.copyFile(files?.file?.[0].filepath, chunkFilePath)
		// await fs.promises.writeFile(chunkFilePath, chunk)
		console.log(`Chunk ${chunkNumber}/${totalChunks} saved`)

		if (chunkNumber === totalChunks - 1) {
			// If this is the last chunk, merge all chunks into a single file
			await mergeChunks(fileName, totalChunks)
			console.log('File merged successfully')
		}

		res.status(200).json({ message: 'Chunk uploaded successfully' })
	} catch (error) {
		console.error('Error saving chunk:', error)
		res.status(500).json({ error: 'Error saving chunk' })
	}
}
