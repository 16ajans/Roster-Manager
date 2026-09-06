import path from 'path'
import multer, { FileFilterCallback, StorageEngine } from 'multer'
import { Request } from 'express'
import { mkdir } from 'fs'

export const dirRoot = path.resolve(__dirname, '../..')

const MAX_UPLOAD_BYTES = 9_000_000

const verifications = path.join(dirRoot as string, 'verifications')
const logos = path.join(dirRoot as string, 'logos')
mkdir(verifications, { recursive: true }, (err) => {
  if (err) console.error(err)
})
mkdir(logos, { recursive: true }, (err) => {
  if (err) console.error(err)
})

const verifStorage: StorageEngine = multer.diskStorage({
  destination: async function (req, file, cb) {
    cb(null, verifications)
  },
  filename: async function (req, file, cb) {
    cb(null, `${req.session.user?.discord}.${Date.now()}${path.extname(file.originalname)}`)
  }
})
async function verifFileFilter(req: Request, file: Express.Multer.File, cb: FileFilterCallback) {
  if (req.get('content-length') as unknown as number > MAX_UPLOAD_BYTES) {
    cb(null, false)
  } else if (!file.mimetype.startsWith('image') && file.mimetype !== 'application/pdf') {
    cb(null, false)
  } else {
    cb(null, true)
  }
}

const logoStorage: StorageEngine = multer.diskStorage({
  destination: async function (req, file, cb) {
    cb(null, logos)
  },
  filename: async function (req, file, cb) {
    cb(null, `${req.session.user?.discord}.${Date.now()}${path.extname(file.originalname)}`)
  }
})
async function logoFileFilter(req: Request, file: Express.Multer.File, cb: FileFilterCallback) {
  if (req.get('content-length') as unknown as number > MAX_UPLOAD_BYTES) {
    cb(null, false)
  } else if (!file.mimetype.startsWith('image')) {
    cb(null, false)
  } else {
    cb(null, true)
  }
}

export const verifUpload = multer({ storage: verifStorage, fileFilter: verifFileFilter, limits: { fileSize: MAX_UPLOAD_BYTES } })
export const logoUpload = multer({ storage: logoStorage, fileFilter: logoFileFilter, limits: { fileSize: MAX_UPLOAD_BYTES } })

export const noUpload = multer().none()