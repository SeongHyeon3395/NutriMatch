package com.front

import android.os.Build
import android.os.Bundle
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
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
              // Android 11+(API 30) has Window#setFrameRate, but we avoid compile-time dependency
              // to keep builds working across toolchain/SDK variations.
              try {
                val windowClass = window.javaClass
                val setFrameRate = windowClass.getMethod(
                  "setFrameRate",
                  Float::class.javaPrimitiveType,
                  Int::class.javaPrimitiveType
                )

                // Window.FRAME_RATE_COMPATIBILITY_DEFAULT (int) via reflection
                val compatDefault = try {
                  val field = Class.forName("android.view.Window").getField("FRAME_RATE_COMPATIBILITY_DEFAULT")
                  field.getInt(null)
                } catch (_: Throwable) {
                  0
                }

                setFrameRate.invoke(window, bestMode.refreshRate, compatDefault)
              } catch (_: Throwable) {
                // ignore
              }
            }
          }
        }
      }
    } catch (_: Throwable) {
      // ignore
    }
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    installSplashScreen()
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
