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

/** Estilos de chip con borde (usado en formularios bottom-sheet). */
export const borderedChipStyles = StyleSheet.create({
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e0dbd4',
    backgroundColor: '#fff',
  },
  chipActive: { borderColor: '#6b5b45', backgroundColor: '#f0ede6' },
  chipText: { fontSize: 13, color: '#888', fontWeight: '600' },
  chipTextActive: { color: '#6b5b45' },
});

/** Estilos compartidos para bottom-sheet modal de formulario. */
export const modalFormStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#faf8f5',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 22,
    maxHeight: '90%',
  },
  scroll: { marginBottom: 8 },
  title: { fontSize: 20, fontWeight: '800', color: '#2d2d2d', marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#e0dbd4',
    borderRadius: 12,
    padding: 13,
    fontSize: 15,
    color: '#2d2d2d',
    backgroundColor: '#fff',
  },
  inputError: { borderColor: '#ef4444' },
  err: { fontSize: 12, color: '#ef4444', marginTop: 4 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  cancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f0ede6',
    alignItems: 'center',
  },
  cancelText: { color: '#888', fontSize: 15, fontWeight: '700' },
  confirm: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#6b5b45',
    alignItems: 'center',
  },
  confirmText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.5 },
});
