import React, { useContext } from 'react'

export const useNonNullContext = <T>(context: React.Context<T | null>): T => {
  const contextValue = useContext(context)

  if (contextValue === null) {
    throw Error('Context has not been Provided!')
  }

  return contextValue
}
