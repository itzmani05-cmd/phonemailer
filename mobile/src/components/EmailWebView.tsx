import { lightColors } from '@shared/theme'
import { useState } from 'react'
import { Linking, StyleSheet, View } from 'react-native'
import { WebView } from 'react-native-webview'
import { useTheme } from '@/theme/ThemeProvider'
import { radius } from '@/theme/metrics'

// The CSP blocks every script the email itself carries. Our height reporter is
// injected natively (not via <script>), so CSP does not apply to it.
function emailDocument(html: string) {
  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src * data:; style-src * 'unsafe-inline'; font-src * data:">
<style>html,body{margin:0;padding:12px;background:${lightColors.emailCanvas};color:${lightColors.emailText};
font-family:-apple-system,system-ui,Roboto,sans-serif;font-size:15px;line-height:1.5;word-wrap:break-word}
img{max-width:100%;height:auto}table{max-width:100%}</style></head><body>${html}</body></html>`
}

const REPORT_HEIGHT = `
(function () {
  function send() { window.ReactNativeWebView.postMessage(String(document.documentElement.scrollHeight)); }
  send();
  new ResizeObserver(send).observe(document.body);
  window.addEventListener('load', send);
})();
true;`

/** Renders an HTML email at its natural height so it scrolls with the rest of the reader. */
export function EmailWebView({ html }: { html: string }) {
  const { colors } = useTheme()
  const [height, setHeight] = useState(200)

  return (
    <View style={[styles.frame, { borderColor: colors.border }]}>
      <WebView
        originWhitelist={['*']}
        source={{ html: emailDocument(html) }}
        injectedJavaScript={REPORT_HEIGHT}
        onMessage={(e) => {
          const h = Number(e.nativeEvent.data)
          if (h > 0) setHeight(h)
        }}
        onShouldStartLoadWithRequest={(req) => {
          if (req.url.startsWith('about:') || req.url.startsWith('data:')) return true
          void Linking.openURL(req.url)
          return false
        }}
        scrollEnabled={false}
        setSupportMultipleWindows={false}
        style={{ height, backgroundColor: lightColors.emailCanvas }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  frame: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
})
