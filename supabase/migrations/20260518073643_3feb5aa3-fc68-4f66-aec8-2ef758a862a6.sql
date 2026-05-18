CREATE OR REPLACE FUNCTION public.cms_log_version()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _action TEXT; _etype TEXT; _eid UUID; _snap JSONB; _new_status TEXT; _old_status TEXT;
BEGIN
  _etype := TG_ARGV[0];
  IF TG_OP = 'INSERT' THEN _action := 'created';
  ELSIF TG_OP = 'UPDATE' THEN
    _action := 'updated';
    IF _etype = 'page' THEN
      _new_status := to_jsonb(NEW) ->> 'status';
      _old_status := to_jsonb(OLD) ->> 'status';
      IF _new_status IS DISTINCT FROM _old_status THEN
        IF _new_status = 'published' THEN _action := 'published';
        ELSIF _new_status = 'archived' THEN _action := 'archived';
        END IF;
      END IF;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN _action := 'deleted';
  END IF;
  _eid  := COALESCE((NEW).id, (OLD).id);
  _snap := to_jsonb(COALESCE(NEW, OLD));
  INSERT INTO public.cms_versions(entity_type, entity_id, snapshot, actor_id, action)
  VALUES (_etype, _eid, _snap, auth.uid(), _action);
  RETURN COALESCE(NEW, OLD);
END $function$;

UPDATE public.cms_sections SET
  content_en = jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            jsonb_set(
              COALESCE(content_en, '{}'::jsonb),
              '{eyebrow}', to_jsonb('AI Companion · Medical, Cultural & Beyond'::text)),
            '{titleLine1}', to_jsonb('Your AI Companion'::text)),
          '{highlight}', to_jsonb('for Every Journey'::text)),
        '{subtitle}', to_jsonb('From medical treatment to cultural discovery — RufayQ guides you and your family in Arabic and English with vault, journey tracker, and 6 specialized AI companions.'::text)),
      '{primaryCta}', '{"label":"Start free","link":"/auth"}'::jsonb),
    '{badges}', '[
      {"text":"Trusted by Saudi families","icon":"heart"},
      {"text":"Arabic-first support","icon":"globe"},
      {"text":"Medical + cultural AI","icon":"lock"},
      {"text":"6 AI companions","icon":"heart"}
    ]'::jsonb),
  content_ar = jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            jsonb_set(
              COALESCE(content_ar, '{}'::jsonb),
              '{eyebrow}', to_jsonb('رُفَيِّق · طبي، ثقافي، وأكثر'::text)),
            '{titleLine1}', to_jsonb('رُفَيِّقك الذكي في'::text)),
          '{highlight}', to_jsonb('كل رحلة'::text)),
        '{subtitle}', to_jsonb('من رحلة العلاج إلى الاستكشاف الثقافي — رُفَيِّق يرافقك وعائلتك بالعربية والإنجليزية مع ٦ رُفَيِّقات ذكاء اصطناعي متخصصين.'::text)),
      '{primaryCta}', '{"label":"ابدأ مجاناً","link":"/auth"}'::jsonb),
    '{badges}', '[
      {"text":"موثوق من العائلات السعودية","icon":"heart"},
      {"text":"دعم عربي أولاً","icon":"globe"},
      {"text":"ذكاء اصطناعي طبي وثقافي","icon":"lock"},
      {"text":"٦ رُفَيِّقات ذكاء اصطناعي","icon":"heart"}
    ]'::jsonb),
  updated_at = now()
WHERE id = '93affe2f-3e68-43ae-9199-5f73c58e6e91';