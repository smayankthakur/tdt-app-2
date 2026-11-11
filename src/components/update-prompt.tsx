import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import { AppState, Modal, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { useLang } from '@/i18n';
import { checkForUpdate, currentVersionName, isSnoozed, onUpdateFound, openUpdate, selfUpdates, snooze, type UpdateInfo } from '@/lib/app-update';

/**
 * "New update" sheet for the website-installed Android app (see src/lib/app-update.ts). Checks on start and each
 * time the app comes back to the screen (at most every 30 minutes); Profile → "Check for update" opens it too.
 */
export function UpdatePrompt() {
  const { t, lang } = useLang();
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const last = useRef(0);

  useEffect(() => {
    if (!selfUpdates) return;
    let alive = true;
    const run = async () => {
      if (Date.now() - last.current < 30 * 60_000) return;
      last.current = Date.now();
      const found = await checkForUpdate();
      if (alive && found && !(await isSnoozed(found))) setInfo(found);
    };
    const first = setTimeout(run, 2500); // after the loading screen
    const sub = AppState.addEventListener('change', (s) => s === 'active' && run());
    const off = onUpdateFound((i) => setInfo(i));
    return () => {
      alive = false;
      clearTimeout(first);
      sub.remove();
      off();
    };
  }, []);

  if (!info) return null;
  const note = info.notes[lang] || info.notes.en || '';
  return (
    <Modal transparent animationType="fade" visible onRequestClose={() => !info.force && setInfo(null)}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.icon}>
            <Ionicons name="sparkles" size={26} color={Colors.bg} />
          </View>
          <Text style={styles.title}>{t('update.title')}</Text>
          <Text style={styles.versions}>
            v{currentVersionName()} → v{info.versionName}
          </Text>
          <Text style={styles.body}>{note || t('update.body')}</Text>
          <Text style={styles.hint}>{t('update.hint')}</Text>
          <Button label={t('update.now')} icon="download-outline" onPress={() => openUpdate(info).catch(() => {})} style={{ alignSelf: 'stretch' }} />
          {info.force ? null : (
            <Button
              variant="ghost"
              small
              label={t('update.later')}
              onPress={() => {
                snooze(info).catch(() => {});
                setInfo(null);
              }}
              style={{ alignSelf: 'stretch', marginTop: Spacing.sm }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(5,3,8,0.78)', alignItems: 'center', justifyContent: 'center', padding: Spacing.lg },
  sheet: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: Colors.bgElevated,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  icon: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.gold, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  title: { fontFamily: Fonts.display, fontSize: 20, color: Colors.goldSoft, textAlign: 'center' },
  versions: { fontFamily: Fonts.bodyMedium, fontSize: 13, color: Colors.textMuted, marginTop: 4 },
  body: { fontFamily: Fonts.body, fontSize: 15, lineHeight: 22, color: Colors.text, textAlign: 'center', marginTop: Spacing.md },
  hint: { fontFamily: Fonts.body, fontSize: 12.5, lineHeight: 18, color: Colors.textDim, textAlign: 'center', marginTop: Spacing.sm, marginBottom: Spacing.md },
});
