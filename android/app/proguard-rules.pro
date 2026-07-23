# Add project specific ProGuard rules here.

# Methods exposed to the bundled WebView are invoked from JavaScript.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
