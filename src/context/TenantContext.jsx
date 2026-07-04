import { createContext, useContext } from 'react'

const TenantContext = createContext(null)

export function TenantProvider({ tenant, children }) {
  return (
    <TenantContext.Provider value={tenant}>
      {children}
    </TenantContext.Provider>
  )
}

// App only renders the authenticated tree once tenant is loaded,
// so consumers can rely on tenant being non-null.
export function useTenant() {
  return useContext(TenantContext)
}
