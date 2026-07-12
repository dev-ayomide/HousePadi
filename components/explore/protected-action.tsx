'use client'

import React, { cloneElement, ReactElement } from 'react'
import { useConsumerAuth } from './consumer-auth-provider'

interface ProtectedActionProps {
  children: ReactElement<{ onClick?: React.MouseEventHandler<any> }>
  onClick?: () => void
  isFavorite?: boolean
}

/**
 * ProtectedAction Interceptor
 * Intercepts user interactions (like saving favorites or viewing 3D models)
 * and prompts authentication via an inline modal if no session exists.
 */
export function ProtectedAction({ children, onClick, isFavorite = false }: ProtectedActionProps) {
  const { triggerProtectedAction } = useConsumerAuth()

  const handleIntercept = (e: React.MouseEvent<any>) => {
    e.preventDefault()
    e.stopPropagation()
    
    const targetAction = onClick || children.props.onClick
    if (targetAction) {
      triggerProtectedAction(() => {
        // Fire the original handler, mimicking a React MouseEvent structure
        (targetAction as any)({
          preventDefault: () => {},
          stopPropagation: () => {},
          nativeEvent: e.nativeEvent,
          currentTarget: e.currentTarget,
          target: e.target,
          bubbles: e.bubbles,
          cancelable: e.cancelable
        })
      }, { isFavorite })
    }
  }

  // Cast target object to any during cloneElement to safely override onClick
  return cloneElement(children, {
    onClick: handleIntercept
  } as any)
}
