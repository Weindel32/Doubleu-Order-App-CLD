-- Canali IA per i prospect: contatto arrivato da una ricerca su assistente IA.
-- 'ia' = IA non specificata; 'ia-<strumento>' = quale IA, se il contatto lo dice.
-- Allarga solo il vincolo: nessun dato esistente viene modificato.
alter table prospects drop constraint if exists prospects_channel_origin_check;
alter table prospects add constraint prospects_channel_origin_check
  check (channel_origin = any (array[
    'linkedin','wfox','referral','fiera','outbound','web','instagram','facebook',
    'ia','ia-chatgpt','ia-gemini','ia-perplexity','ia-claude','ia-copilot'
  ]::text[]));
