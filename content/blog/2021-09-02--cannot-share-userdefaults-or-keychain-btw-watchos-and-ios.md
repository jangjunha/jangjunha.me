+++
title = "Watch Extension과 iOS간 UserDefaults 또는 키체인을 공유할 수 없다"
slug = "cannot-share-userdefaults-or-keychain-btw-watchos-and-ios"
date = "2021-09-02"

[taxonomies]
tags = ["ios", "watchos", "userdefaults", "keychain"]

[extra]
featured = true
+++

iOS 타겟과 Watch Extension간 UserDefaults 또는 키체인을 공유할 수 없다.

iOS 앱과 Widget Extension 등과는 App Group 설정 혹은 Keychain Sharing을 통해 UserDefaults 혹은 키체인을 공유해서 사용할 수 있다. 그 기억을 바탕으로 Watch Extension과도 자연스레 공유가 될 것이라고 생각했지만 그렇지 않다. (인터넷에서 이것저것 검색해보니 아마 watchOS 2까지는 됐던 것 같다.) Apple Developer의 [〈UserDefaults〉 문서](UserDefaults-Sandbox)에도 쓰여 있다.

> A sandboxed app cannot access or modify the preferences for any other app, with the following exceptions:
>
> - App extensions on macOS and iOS
> - Other apps in your application group on macOS

(watchOS에서 동작하는) Watch Extension은 예외에 포함되지 않는다.

[〈Keeping Your watchOS Content Up to Date〉][keeping your watchos content up to date]를 살펴보니 토큰이나 설정값을 공유하려는 내 사용 사례에서는 대신 [Watch Connectivity][watch connectivity]를 사용하는 것이 적합했다. 그 외에는 인터넷에 저장된 데이터에 `URLSession`을 통해 직접 접근하는 방법이나 CloudKit을 이용하는 방법이 있다.

[userdefaults-sandbox]: https://developer.apple.com/documentation/foundation/userdefaults#1664611
[watch connectivity]: https://developer.apple.com/documentation/watchconnectivity
[keeping your watchos content up to date]: https://developer.apple.com/documentation/watchkit/keeping_your_watchos_content_up_to_date
