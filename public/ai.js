/* AI-verwerking van een vacaturetekst met de eigen OpenAI-key van de gebruiker.
   De aanroep gaat rechtstreeks vanuit de browser naar OpenAI; er is geen server van ons tussen. */
(function () {
  const ENDPOINT = 'https://api.openai.com/v1/chat/completions';
  const MAX_CHARS = 15000;

  const str = { type: 'string' };
  const list = { type: 'array', items: { type: 'string' } };
  const SCHEMA = {
    type: 'object',
    additionalProperties: false,
    required: ['language', 'title', 'employer', 'highlight', 'location', 'hours', 'contract', 'salary', 'tasks', 'profile', 'offer', 'applyUrl', 'reference'],
    properties: {
      language: { type: 'string', enum: ['pl', 'nl', 'other'] },
      title: str, employer: str, highlight: str, location: str, hours: str, contract: str, salary: str,
      tasks: list, profile: list, offer: list, applyUrl: str, reference: str,
    },
  };

  const SYSTEM = `You turn a recruitment vacancy text into the content of a short social-media job poster.
Rules:
- Write every output value in the SAME language as the vacancy text. Never translate. Set "language" to "pl" (Polish), "nl" (Dutch) or "other".
- Never invent facts. If something is not in the text, return an empty string (or an empty array).
- "title": the job title only, without words like "vacancy" or "we are looking for", without company name.
- "employer": the TYPE of employer in at most 8 words (e.g. "International machine manufacturer"), not the company name, unless the text gives only the name.
- "highlight": the single most attractive selling point as a very short phrase (max 30 characters), or empty.
- "location": place name(s) only.
- "hours": working hours / shifts in a few words (e.g. "40 h/week, day shift").
- "contract": type of employment in a few words. "salary": pay as written, short.
- "tasks", "profile", "offer": the 3 most important points each (a 4th only for "offer" if it is a strong selling point), in order of importance. Each point is a short phrase of at most 45 characters (hard limit 55), no trailing period, no bullet characters, so it fits on one or two short lines of a poster. Merge and shorten long sentences. "profile" = requirements for the candidate. "offer" = what the employer offers.
- "applyUrl": a link to apply for this specific vacancy, if present. "reference": a vacancy/reference number, if present.
Return only JSON that matches the schema.`;

  const fail = (code, message) => Object.assign(new Error(message || code), { code });

  async function extract(text, { key, model }) {
    let res;
    try {
      res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
        body: JSON.stringify({
          model,
          messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: text.slice(0, MAX_CHARS) }],
          response_format: { type: 'json_schema', json_schema: { name: 'vacancy_poster', strict: true, schema: SCHEMA } },
        }),
      });
    } catch (e) { throw fail('network', e.message); }

    if (!res.ok) {
      let detail = '';
      try { detail = (await res.json()).error?.message || ''; } catch {}
      if (res.status === 401) throw fail('key', detail);
      if (res.status === 429) throw fail('quota', detail);
      if (res.status === 404 || /model/i.test(detail)) throw fail('model', detail);
      throw fail('http', `${res.status} ${detail}`.trim());
    }

    let data;
    try {
      const json = await res.json();
      data = JSON.parse(json.choices[0].message.content);
    } catch { throw fail('format'); }

    const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();
    const fields = {};
    for (const k of ['title', 'employer', 'highlight', 'location', 'hours', 'contract', 'salary', 'applyUrl', 'reference']) {
      const v = clean(data[k]);
      if (v) fields[k] = v;
    }
    for (const k of ['tasks', 'profile', 'offer']) {
      const v = (Array.isArray(data[k]) ? data[k] : []).map(clean).filter(Boolean).join('\n');
      if (v) fields[k] = v;
    }
    return { fields, language: data.language };
  }

  window.AIExtract = { extract };
})();
