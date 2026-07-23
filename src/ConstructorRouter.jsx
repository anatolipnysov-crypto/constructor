import Constructor from './App.jsx'
import { installProtectedProjectStorageGuard } from './security/protectedProjectStorage.js'

installProtectedProjectStorageGuard()

export default function ConstructorRouter() {
  return <Constructor />
}
