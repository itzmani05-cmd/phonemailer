package expo.modules.phonehint

import android.app.Activity
import com.google.android.gms.auth.api.identity.GetPhoneNumberHintIntentRequest
import com.google.android.gms.auth.api.identity.Identity
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

private const val REQUEST_CODE = 43821

class PhoneHintModule : Module() {
  private var pending: Promise? = null

  override fun definition() = ModuleDefinition {
    Name("PhoneHint")

    AsyncFunction("requestPhoneNumber") { promise: Promise ->
      val activity = appContext.currentActivity
      if (activity == null) {
        promise.resolve(null)
        return@AsyncFunction
      }
      finish(null)
      pending = promise
      Identity.getSignInClient(activity)
        .getPhoneNumberHintIntent(GetPhoneNumberHintIntentRequest.builder().build())
        .addOnSuccessListener { intent ->
          try {
            activity.startIntentSenderForResult(intent.intentSender, REQUEST_CODE, null, 0, 0, 0)
          } catch (e: Exception) {
            finish(null)
          }
        }
        .addOnFailureListener { finish(null) }
    }

    OnActivityResult { activity, payload ->
      if (payload.requestCode != REQUEST_CODE) return@OnActivityResult
      val data = payload.data
      val number = if (payload.resultCode == Activity.RESULT_OK && data != null) {
        try {
          Identity.getSignInClient(activity).getPhoneNumberFromIntent(data)
        } catch (e: Exception) {
          null
        }
      } else {
        null
      }
      finish(number)
    }
  }

  private fun finish(number: String?) {
    pending?.resolve(number)
    pending = null
  }
}
