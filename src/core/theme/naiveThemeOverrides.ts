import type { GlobalThemeOverrides } from 'naive-ui'
import { brand, fontFamily, status, surfaceDark, surfaceLight } from './tokens'

const common = {
  fontFamily,
  primaryColor: brand[600],
  primaryColorHover: brand[500],
  primaryColorPressed: brand[700],
  primaryColorSuppl: brand[500],
  successColor: status.success,
  warningColor: status.warning,
  errorColor: status.error,
  infoColor: status.info,
  borderRadius: '8px',
}

export const lightThemeOverrides: GlobalThemeOverrides = {
  common: {
    ...common,
    bodyColor: surfaceLight[50],
    cardColor: surfaceLight[0],
    modalColor: surfaceLight[0],
    popoverColor: surfaceLight[0],
    borderColor: surfaceLight.border,
  },
  DataTable: {
    thColor: surfaceLight[50],
    tdColor: surfaceLight[0],
  },
  Card: {
    borderRadius: '12px',
  },
}

export const darkThemeOverrides: GlobalThemeOverrides = {
  common: {
    ...common,
    bodyColor: surfaceDark[50],
    cardColor: surfaceDark[100],
    modalColor: surfaceDark[100],
    popoverColor: surfaceDark[100],
    borderColor: surfaceDark.border,
  },
  DataTable: {
    thColor: surfaceDark[0],
    tdColor: surfaceDark[100],
  },
  Card: {
    borderRadius: '12px',
  },
}
