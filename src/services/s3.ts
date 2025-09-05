// src/services/s3.ts

import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { env, l, err } from '../utils'
import type { ShowNoteType } from '../types'

const pre = "[s3.service]"

class S3ShowNotesService {
  private client: S3Client
  private bucket: string

  constructor() {
    const region = env['AWS_REGION'] || 'us-east-2'
    this.bucket = env['S3_BUCKET_NAME'] || 'autoshow-test'
    this.client = new S3Client({ region })
    l(`${pre} Initialized with bucket: ${this.bucket}, region: ${region}`)
  }

  private generateId(): string {
    return Date.now().toString()
  }

  async createShowNote(metadata: Partial<ShowNoteType>): Promise<{ id: string, showNote: ShowNoteType }> {
    const id = this.generateId()
    l(`${pre} Creating show note with ID: ${id}`)

    const showNote: ShowNoteType = {
      id: parseInt(id),
      showLink: metadata.showLink,
      channel: metadata.channel,
      channelURL: metadata.channelURL,
      title: metadata.title || 'Untitled Show Note',
      description: metadata.description,
      publishDate: metadata.publishDate || new Date().toISOString().split('T')[0],
      coverImage: metadata.coverImage,
      frontmatter: metadata.frontmatter,
      prompt: metadata.prompt,
      transcript: metadata.transcript,
      llmOutput: metadata.llmOutput,
      llmService: metadata.llmService,
      llmModel: metadata.llmModel,
      llmCost: metadata.llmCost,
      transcriptionService: metadata.transcriptionService,
      transcriptionModel: metadata.transcriptionModel,
      transcriptionCost: metadata.transcriptionCost,
      finalCost: metadata.finalCost
    }

    const key = `show-notes/${id}/metadata.json`
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: JSON.stringify(showNote, null, 2),
      ContentType: 'application/json'
    }))

    l(`${pre} Show note metadata created: ${key}`)
    return { id, showNote }
  }

  async updateShowNote(id: string, updates: Partial<ShowNoteType>): Promise<ShowNoteType> {
    l(`${pre} Updating show note: ${id}`)
    
    const existingShowNote = await this.getShowNote(id)
    if (!existingShowNote) {
      throw new Error(`Show note ${id} not found`)
    }

    const updatedShowNote = {
      ...existingShowNote,
      ...updates
    }

    const key = `show-notes/${id}/metadata.json`
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: JSON.stringify(updatedShowNote, null, 2),
      ContentType: 'application/json'
    }))

    l(`${pre} Show note updated: ${key}`)
    return updatedShowNote
  }

  async saveTranscription(id: string, transcription: string): Promise<void> {
    l(`${pre} Saving transcription for show note: ${id}`)
    
    const key = `show-notes/${id}/transcription.txt`
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: transcription,
      ContentType: 'text/plain'
    }))

    l(`${pre} Transcription saved: ${key}`)
  }

  async saveLLMOutput(id: string, llmOutput: string): Promise<void> {
    l(`${pre} Saving LLM output for show note: ${id}`)
    
    const key = `show-notes/${id}/llm-output.txt`
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: llmOutput,
      ContentType: 'text/plain'
    }))

    l(`${pre} LLM output saved: ${key}`)
  }

  async getShowNote(id: string): Promise<ShowNoteType | null> {
    l(`${pre} Fetching show note: ${id}`)
    
    try {
      const key = `show-notes/${id}/metadata.json`
      const response = await this.client.send(new GetObjectCommand({
        Bucket: this.bucket,
        Key: key
      }))

      if (!response.Body) {
        return null
      }

      const metadataText = await response.Body.transformToString()
      const metadata = JSON.parse(metadataText)

      const transcriptionKey = `show-notes/${id}/transcription.txt`
      let transcription = ''
      try {
        const transcriptionResponse = await this.client.send(new GetObjectCommand({
          Bucket: this.bucket,
          Key: transcriptionKey
        }))
        if (transcriptionResponse.Body) {
          transcription = await transcriptionResponse.Body.transformToString()
        }
      } catch (error) {
        l(`${pre} No transcription found for show note: ${id}`)
      }

      const llmOutputKey = `show-notes/${id}/llm-output.txt`
      let llmOutput = ''
      try {
        const llmOutputResponse = await this.client.send(new GetObjectCommand({
          Bucket: this.bucket,
          Key: llmOutputKey
        }))
        if (llmOutputResponse.Body) {
          llmOutput = await llmOutputResponse.Body.transformToString()
        }
      } catch (error) {
        l(`${pre} No LLM output found for show note: ${id}`)
      }

      const showNote: ShowNoteType = {
        ...metadata,
        transcript: transcription,
        llmOutput: llmOutput
      }

      l(`${pre} Show note fetched successfully: ${id}`)
      return showNote
    } catch (error) {
      err(`${pre} Error fetching show note ${id}:`, error)
      return null
    }
  }

  async getAllShowNotes(): Promise<ShowNoteType[]> {
    l(`${pre} Fetching all show notes`)
    
    try {
      const response = await this.client.send(new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: 'show-notes/',
        Delimiter: '/'
      }))

      if (!response.CommonPrefixes) {
        return []
      }

      const showNotes: ShowNoteType[] = []
      
      for (const prefix of response.CommonPrefixes) {
        if (!prefix.Prefix) continue
        
        const match = prefix.Prefix.match(/show-notes\/(\d+)\/$/)
        if (!match) continue
        
        const id = match[1]
        const showNote = await this.getShowNote(id)
        if (showNote) {
          showNotes.push(showNote)
        }
      }

      showNotes.sort((a, b) => {
        const dateA = new Date(a.publishDate).getTime()
        const dateB = new Date(b.publishDate).getTime()
        return dateA - dateB
      })

      l(`${pre} Found ${showNotes.length} show notes`)
      return showNotes
    } catch (error) {
      err(`${pre} Error fetching all show notes:`, error)
      return []
    }
  }

  async getAudioSignedUrl(filename: string): Promise<string> {
    l(`${pre} Getting signed URL for audio file: ${filename}`)
    
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: filename
    })
    
    const signedUrl = await getSignedUrl(this.client, command, { expiresIn: 86400 })
    l(`${pre} Generated signed URL for: ${filename}`)
    return signedUrl
  }
}

export const s3Service = new S3ShowNotesService()