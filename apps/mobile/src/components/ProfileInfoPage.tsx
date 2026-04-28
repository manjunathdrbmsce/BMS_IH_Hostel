import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { Card } from '@/components/ui';

type InfoSection = {
  title: string;
  body: string;
};

type ProfileInfoPageProps = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  profileRoute: string;
  sections: InfoSection[];
};

export function ProfileInfoPage({ title, icon, profileRoute, sections }: ProfileInfoPageProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();

  const handleBack = () => {
    if (returnTo === 'profile') {
      router.replace(profileRoute as any);
      return;
    }

    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}>
        <Card variant="elevated" style={styles.heroCard}>
          <View style={[styles.heroIcon, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name={icon} size={28} color={colors.primary} />
          </View>
          <Text style={[styles.heroTitle, { color: colors.text }]}>{title}</Text>
        </Card>

        {sections.map((section) => (
          <Card key={section.title} variant="outlined" style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
            <Text style={[styles.sectionBody, { color: colors.textSecondary }]}>{section.body}</Text>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16 },
  backButton: { marginRight: 12 },
  headerTitle: { fontSize: 22, fontWeight: '800' },
  heroCard: { alignItems: 'center', padding: 24, marginBottom: 16 },
  heroIcon: { width: 60, height: 60, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 20, fontWeight: '800', marginTop: 12 },
  sectionCard: { padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  sectionBody: { fontSize: 14, lineHeight: 21 },
});
