CREATE POLICY "Deny all anon access" ON public.sync_payloads
  FOR ALL TO anon USING (false) WITH CHECK (false);

CREATE POLICY "Deny all authenticated access" ON public.sync_payloads
  FOR ALL TO authenticated USING (false) WITH CHECK (false);