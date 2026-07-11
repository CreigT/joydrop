type ContributionCopy = {
  contributor_name: string;
  message_text: string | null;
  voice_url: string | null;
};

export async function createBirthdayScript(
  recipientName: string,
  contributions: ContributionCopy[]
) {
  const prompt = [
    `You are a birthday speech writer. Combine these friend messages into one 45-60 second heartfelt speech for ${recipientName}.`,
    "Write in second person, warm, specific, no clichés.",
    `Birthday person: ${recipientName}`,
    `Messages: ${JSON.stringify(contributions)}`
  ].join("\n");

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required to generate an AI draft.");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You write consent-based birthday surprise scripts. Return only the script."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 240
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI generation failed with ${response.status}.`);
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  return json.choices?.[0]?.message?.content?.trim() ?? "";
}

export async function createVoiceAudio(script: string) {
  if (!process.env.ELEVENLABS_API_KEY || !process.env.ELEVENLABS_VOICE_ID) {
    throw new Error(
      "ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID are required to generate voice."
    );
  }

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text: script,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      })
    }
  );

  if (!response.ok) {
    throw new Error(`ElevenLabs voice generation failed with ${response.status}.`);
  }

  const audio = Buffer.from(await response.arrayBuffer()).toString("base64");
  return `data:audio/mpeg;base64,${audio}`;
}
