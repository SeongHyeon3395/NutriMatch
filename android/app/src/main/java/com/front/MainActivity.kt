package com.front

import android.os.Build
import android.os.Bundle
import android.view.Window
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  private fun applyHighRefreshRatePreference() {
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        val disp = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) display else windowManager.defaultDisplay
        val modes = disp?.supportedModes
        if (modes != null && modes.isNotEmpty()) {
          val bestMode = modes.maxByOrNull { it.refreshRate }
          if (bestMode != null) {
            val attrs = window.attributes
            attrs.preferredDisplayModeId = bestMode.modeId
            window.attributes = attrs

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
              window.setFrameRate(bestMode.refreshRate, Window.FRAME_RATE_COMPATIBILITY_DEFAULT)
            }
          }
        }
      }
    } catch (_: Throwable) {
      // ignore
    }
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    applyHighRefreshRatePreference()
  }

  override fun onResume() {
    super.onResume()
    applyHighRefreshRatePreference()
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "Front"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
