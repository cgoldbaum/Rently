import { StyleSheet } from 'react-native';

export const chipStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0ede6',
  },
  chipActive: {
    backgroundColor: '#6b5b45',
  },
  chipText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600' as const,
  },
  chipTextActive: {
    color: '#fff',
  },
});

export const shadowStyles = StyleSheet.create({
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardLight: {
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
});
