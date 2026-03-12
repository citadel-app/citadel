import { useState, useEffect } from 'react'

function Versions(): React.JSX.Element {
  const [versions] = useState(window.electron.process.versions)
  const [appVersion, setAppVersion] = useState<string>('')

  useEffect(() => {
    window.api.app.getInitContext().then((ctx: any) => {
      if (ctx?.appVersion) setAppVersion(ctx.appVersion)
    })
  }, [])

  return (
    <ul className="versions">
      {appVersion && <li className="app-version">Citadel v{appVersion}</li>}
      <li className="electron-version">Electron v{versions.electron}</li>
      <li className="chrome-version">Chromium v{versions.chrome}</li>
      <li className="node-version">Node v{versions.node}</li>
    </ul>
  )
}

export default Versions
