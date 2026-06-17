const EMBEDDING_MODEL = "text-embedding-3-small"
const EMBEDDING_DIMENSIONS = 1536

function getOpenAiKey(): string {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set")
  }
  return apiKey
}

export async function createEmbedding(text: string): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getOpenAiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text,
      dimensions: EMBEDDING_DIMENSIONS,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      `OpenAI embedding request failed: ${data?.error?.message ?? response.statusText}`
    )
  }

  const embedding = data.data?.[0]?.embedding as number[] | undefined
  if (!embedding?.length) {
    throw new Error("OpenAI returned an empty embedding")
  }

  return JSON.stringify(embedding)
}
