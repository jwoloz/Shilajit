import { useRef, useState, useCallback } from 'react'
import { View, PanResponder, StyleSheet, TouchableOpacity, Text } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { Colors, Spacing } from '@/constants/theme'

interface Stroke {
  d: string
  color: string
  width: number
}

interface Props {
  onSave: (canvasData: string) => void
  height?: number
}

const COLORS = [Colors.text, Colors.primary, Colors.accent, '#4CAF50', '#FF6D00', '#E91E63']

export function DrawingCanvas({ onSave, height = 300 }: Props) {
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [color, setColor] = useState(Colors.text)
  const [strokeWidth, setStrokeWidth] = useState(3)
  const currentPath = useRef('')
  const isDrawing = useRef(false)

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent
        currentPath.current = `M ${locationX.toFixed(1)} ${locationY.toFixed(1)}`
        isDrawing.current = true
      },
      onPanResponderMove: (evt) => {
        if (!isDrawing.current) return
        const { locationX, locationY } = evt.nativeEvent
        currentPath.current += ` L ${locationX.toFixed(1)} ${locationY.toFixed(1)}`
        // Force re-render to show live stroke
        setStrokes((prev) => {
          const updated = [...prev]
          if (updated.length > 0 && updated[updated.length - 1].d === '__live__') {
            updated[updated.length - 1] = {
              d: currentPath.current,
              color,
              width: strokeWidth,
            }
          } else {
            updated.push({ d: currentPath.current, color, width: strokeWidth })
          }
          return updated
        })
      },
      onPanResponderRelease: () => {
        isDrawing.current = false
      },
    })
  ).current

  const handleUndo = useCallback(() => {
    setStrokes((prev) => prev.slice(0, -1))
  }, [])

  const handleClear = useCallback(() => {
    setStrokes([])
  }, [])

  const handleSave = useCallback(() => {
    onSave(JSON.stringify(strokes))
  }, [strokes, onSave])

  return (
    <View style={styles.container}>
      {/* Color palette */}
      <View style={styles.palette}>
        {COLORS.map((c) => (
          <TouchableOpacity
            key={c}
            style={[styles.colorDot, { backgroundColor: c }, color === c && styles.colorDotActive]}
            onPress={() => setColor(c)}
          />
        ))}
        <View style={styles.spacer} />
        <TouchableOpacity onPress={handleUndo} style={styles.toolBtn}>
          <Text style={styles.toolBtnText}>↩</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleClear} style={styles.toolBtn}>
          <Text style={styles.toolBtnText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Canvas */}
      <View
        style={[styles.canvas, { height }]}
        {...panResponder.panHandlers}
      >
        <Svg width="100%" height="100%">
          {strokes.map((s, i) => (
            <Path
              key={i}
              d={s.d}
              stroke={s.color}
              strokeWidth={s.width}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </Svg>
      </View>

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
        <Text style={styles.saveBtnText}>Save Drawing</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: Spacing.sm },
  palette: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorDotActive: { borderColor: '#fff' },
  spacer: { flex: 1 },
  toolBtn: {
    padding: Spacing.xs,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    minWidth: 36,
    alignItems: 'center',
  },
  toolBtnText: { color: Colors.text, fontSize: 18 },
  canvas: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '600' },
})
