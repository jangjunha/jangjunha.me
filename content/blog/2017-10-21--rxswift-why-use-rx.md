+++
title = "[번역] Rx를 왜 사용해야하나요?"
slug = "rxswift-why-use-rx"
date = "2017-10-21"

[taxonomies]
tags = ["rx", "rxswift", "swift", "translate"]
+++

이 글은 [RxSwift](https://github.com/ReactiveX/RxSwift)의 [문서](https://github.com/ReactiveX/RxSwift/blob/6be49b1605ca12387492703b0447a95ad896ee1f/Documentation/Why.md)를 번역한 글입니다.

- 원문: [I came here because I want to understand **why** use rx?](https://github.com/ReactiveX/RxSwift/blob/master/Documentation/Why.md)

---

**Rx를 사용하면 서술하는 것처럼 애플리케이션을 만들 수 있습니다.** (Rx enables building apps in a declarative way.)

## 바인딩

```Swift
Observable.combineLatest(firstName.rx.text, lastName.rx.text) { $0 + " " + $1 }
    .map { "Greetings, \($0)" }
    .bind(to: greetingLabel.rx.text)
```

`UITableView`와 `UICollectionView`에도 마찬가지로 사용할 수 있습니다.

```Swift
viewModel
    .rows
    .bind(to: resultsTableView.rx.items(cellIdentifier: "WikipediaSearchCell", cellType: WikipediaSearchCell.self)) { (_, viewModel, cell) in
        cell.title = viewModel.title
        cell.url = viewModel.url
    }
    .disposed(by: disposeBag)
```

**단순 바인딩처럼 dispose가 꼭 필요하지 않은 경우에도 항상 `.disposed(by: disposeBag)`를 사용하기를 공식적으로 추천합니다.**

## 재시도

API가 항상 제대로 작동하면 좋겠지만 그렇지만은 않습니다. 예시로 다음과 같은 API 메소드가 있습니다:

```Swift
func doSomethingIncredible(forWho: String) throws -> IncredibleThing
```

만약 이 기능을 있는 그대로 사용한다면, 오류가 발생한 경우 재시도하도록 만들기 어렵습니다. [Exponential backoff](https://en.wikipedia.org/wiki/Exponential_backoff) 모델링의 복잡함은 말 할 것도 없습니다. 물론 가능합니다. 하지만 코드에 진짜 신경 쓸 필요가 없었던 일시적 상태(transient state)들이 많이 들어갈 것이고, 재사용도 안됩니다.

이상적으로는 '재시도'라는 본질에 집중해야 하고, 어느 동작이든간에 적용할 수 있어야합니다.

Rx를 사용하면 다음처럼 간단하게 재시도할 수 있습니다.

```Swift
doSomethingIncredible("me")
    .retry(3)
```

재시도 동작을 커스터마이징 하는 것 역시 쉽습니다.

## Delegates

장황하고 직관적이지 않은(non-expressive) 아래 코드 대신

```swift
public func scrollViewDidScroll(scrollView: UIScrollView) { [weak self] // what scroll view is this bound to?
    self?.leftPositionConstraint.constant = scrollView.contentOffset.x
}
```

다음처럼 작성할 수 있습니다.

```Swift
self.resultsTableView
    .rx.contentOffset
    .map { $0.x }
    .bind(to: self.leftPositionConstraint.rx.constant)
```

## KVO

아래 방법 대신에

```
`TickTock` was deallocated while key value observers were still registered with it. Observation info was leaked, and may even become mistakenly attached to some other object.
```

```objective-c
-(void)observeValueForKeyPath:(NSString *)keyPath
                     ofObject:(id)object
                       change:(NSDictionary *)change
                      context:(void *)context
```

[`rx.observe`와 `rx.observeWeakly`](https://github.com/ReactiveX/RxSwift/blob/master/Documentation/GettingStarted.md#kvo)를 사용하세요.

그러면 다음과 같이 사용할 수 있습니다:

```swift
view.rx.observe(CGRect.self, "frame")
    .subscribe(onNext: { frame in
        print("Got new frame \(frame)")
    })
    .disposed(by: disposeBag)
```

```swift
someSuspiciousViewController
    .rx.observeWeakly(Bool.self, "behavingOk")
    .subscribe(onNext: { behavingOk in
        print("Cats can purr? \(behavingOk)")
    })
    .disposed(by: disposeBag)
```

## Notifications

아래 방법 대신

```objective-c
@available(iOS 4.0, *)
public func addObserverForName(name: String?, object obj: AnyObject?, queue: NSOperationQueue?, usingBlock block: (NSNotification) -> Void) -> NSObjectProtocol
```

이렇게 쓰세요.

```Swift
NotificationCenter.default
    .rx.notification(NSNotification.Name.UITextViewTextDidBeginEditing, object: myTextView)
    .map {  /*do something with data*/ }
    ....
```

## 일시적 상태(Transient state)

비동기 프로그램을 만들 때 일시적 상태는 많은 문제를 만듭니다. 전형적인 사례로 검색창의 자동완성 기능이 있습니다.

만약 Rx를 사용하지 않고 자동완성 코드를 작성한다면 여러 문제들을 해결해야합니다. 먼저 `abc`에서 `c`가 타이핑됐을 때, `ab`에 대한 이전 요청이 완료되지 않았다면 이전 요청을 취소해야합니다. 이 문제를 해결하는 건 크게 어렵지는 않습니다. (완료되지 않은) 이전 요청을 참조하는 변수를 추가하면 됩니다.

다음은 요청이 실패했을 경우 복잡한 재시도 로직을 작성해야한다는 문제입니다. 이것도 재시도 횟수 변수 몇 개를 추가해서 해결할 수는 있습니다.

하지만 서버에 요청을 보내기 전에 잠시 기다리도록 하는 것이 좋습니다. 사용자가 매우 느리게 타이핑하는 경우에 매 타이핑마다 서버에 요청을 보내고 싶지는 않겠죠. 또 다시 타이머 변수를 추가해야하겠죠?

검색중인 경우와 재시도 끝에 실패 한 경우 이를 화면에 표시하는 일 역시 문제입니다.

이 모든 것을 구현하고 테스트하는 것은 복잡합니다. 하지만 Rx를 사용하면 같은 동작을 다음과 같이 작성할 수 있습니다.

```swift
searchTextField.rx.text
    .throttle(0.3, scheduler: MainScheduler.instance)
    .distinctUntilChanged()
    .flatMapLatest { query in
        API.getSearchResults(query)
            .retry(3)
            .startWith([]) // clears results on new search term
            .catchErrorJustReturn([])
    }
    .subscribe(onNext: { results in
      // UI에 바인딩
    })
    .disposed(by: disposeBag)
```

추가적인 변수가 없어도 됩니다. Rx가 복잡한 일시적인 상태들을 모두 처리합니다.

## 구성된 작업 중단(Compositional disposal)

테이블뷰에 블러 처리된 이미지를 표시해야 하는 상황을 가정해봅시다. 먼저 URL에 대한 이미지를 다운로드하여 디코딩하고, 블러 처리를 해야합니다.

네트워크 요청과 이미지 블러 처리는 비용이 큰 작업이기때문에 테이블뷰 셀이 보이는 영역에서 벗어난다면 작업이 취소되는 것이 좋습니다.

마찬가지로 블러 처리 비용이 크기 때문에 동시에 처리하는 이미지의 개수를 제한한다면 더욱 좋습니다.

Rx를 사용하면 이 모든 걸 다음과 같이 구현할 수 있습니다.

```swift
// this is a conceptual solution
let imageSubscription = imageURLs
    .throttle(0.2, scheduler: MainScheduler.instance)
    .flatMapLatest { imageURL in
        API.fetchImage(imageURL)
    }
    .observeOn(operationScheduler)
    .map { imageData in
        return decodeAndBlurImage(imageData)
    }
    .observeOn(MainScheduler.instance)
    .subscribe(onNext: { blurredImage in
        imageView.image = blurredImage
    })
    .disposed(by: reuseDisposeBag)
```

`imageSubscription`이 dispose되면 의존된 모든 비동기 작업들이 취소되고 잘못 바인딩된 이미지가 없는지 확인합니다.

## 네트워크 요청 결합하기

두 개의 요청을 보내고 둘 모두 응답한 후 두 결과를 묶으려면 어떻게 해야 할까요?

`zip` 연산자를 사용하면 됩니다.

```swift
let userRequest: Observable<User> = API.getUser("me")
let friendsRequest: Observable<[Friend]> = API.getFriends("me")

Observable.zip(userRequest, friendsRequest) { user, friends in
    return (user, friends)
}
.subscribe(onNext: { user, friends in
    // 결과를 UI에 바인딩
})
.disposed(by: disposeBag)
```

백그라운드 스레드에서 처리한 API 요청을, 메인 UI 스레드에서 UI에 바인딩하려면 어떻게 해야 할까요? `observeOn`을 사용하면 됩니다.

```swift
let userRequest: Observable<User> = API.getUser("me")
let friendsRequest: Observable<[Friend]> = API.getFriends("me")

Observable.zip(userRequest, friendsRequest) { user, friends in
    return (user, friends)
}
.observeOn(MainScheduler.instance)
.subscribe(onNext: { user, friends in
    // bind them to the user interface
})
.disposed(by: disposeBag)
```

여기 Rx의 진가를 볼 수 있는 더 많은 실사용 예가 있습니다.

## 상태

값의 변경이 가능한 언어에서는 전역 상태에 접근하고 값을 변경하는 것이 쉽습니다. 따라서 공유되는 전역 상태에 대한 값의 변화를 적절하게 제어하지 않으면 [combinatorial explosion](https://en.wikipedia.org/wiki/Combinatorial_explosion#Computing) 문제가 생기기 쉽습니다.

다른 한편으로는 명령형 언어를 적절하게 사용한다면 더 효율적이고 하드웨어에 가까운 코드를 작성할 수 있습니다.

일반적으로는 상태를 최대한 간결하게 유지하고, 모델로부터 만들어진 데이터의 경우 [단방향 데이터 흐름](https://developer.apple.com/videos/play/wwdc2014-229)을 사용하여 combinatorial explosion 문제가 발생하지 않도록 합니다.

여기서 Rx가 진짜 빛을 발합니다.

Rx는 기능적(functional) 세계와 명령형(imperative) 세계의 사이의 sweet spot입니다. Rx를 사용하면 불변의 정의(immutable definitions)와 순수 함수(pure functions)를 사용하여 변화하는 상태의 순간 순간에 대한 처리를 안정적이고 조합 가능한(composable) 방식으로 처리할 수 있습니다.

실사용 예를 들어볼까요?

## 간단한 Integration

기존의 코드에서 observable을 사용하려면 어떻게 해야 할까요? 어렵지 않습니다. 이 코드는 RxCocoa에 있는 코드인데, 이게 URLSession으로 HTTP 요청을 보내는 작업을 래핑하는 데 필요한 전부입니다.

```swift
extension Reactive where Base: URLSession {
    public func response(request: URLRequest) -> Observable<(Data, HTTPURLResponse)> {
        return Observable.create { observer in
            let task = self.base.dataTask(with: request) { (data, response, error) in

                guard let response = response, let data = data else {
                    observer.on(.error(error ?? RxCocoaURLError.unknown))
                    return
                }

                guard let httpResponse = response as? HTTPURLResponse else {
                    observer.on(.error(RxCocoaURLError.nonHTTPResponse(response: response)))
                    return
                }

                observer.on(.next(data, httpResponse))
                observer.on(.completed)
            }

            task.resume()

            return Disposables.create(with: task.cancel)
        }
    }
}
```

## 장점

Rx가 여러분에 코드에 미치는 긍정적인 영향을 다음과 같이 정리할 수 있습니다:

- 조합 가능한(Composable) <- Rx는 조합(composition) 그 자체입니다
- 재사용 가능한(Reusable) <- 조합 가능하기 때문
- 직관적인(Declarative) <- 정의는 변치 않고 오직 값만 바뀌기 때문
- 이해하기 쉽고 간결한 <- 추상화 수준이 높아지고 일시적인 상태들이 제거되기 때문
- 안정적인 <- Rx 코드는 철저하게 단위 테스트를 거치기 때문
- 상태가 적은 <- 단방향 데이터 흐름을 사용하여 앱을 설계하기 때문
- Leak 없는 <- 자원 관리가 쉬워지기 때문

## 이것이 전부가 아닙니다

일반적으로 애플리케이션의 최대한 많은 부분에서 Rx를 사용하도록 설계하는 것이 좋습니다.

하지만 당신이 모든 연산자를 알고 있지 않거나, 각 케이스를 어떤 연산자를 사용해 처리해야하는지는 어떻게 알 수 있을까요?

Rx의 모든 연산자는 수학을 기반으로 하며 직관적입니다.

다행히 10-15개의 연산자만으로 전형적인 케이스를 커버할 수 있습니다. 그중에는 이미 익숙한 `map`, `filter`, `zip`, `observeOn`과 같은 연산자들도 있습니다.

Rx에는 방대한 양의 [연산자 목록](http://reactivex.io/documentation/operators.html)이 있습니다.

각 연산자마다 어떻게 작동하는지를 설명하는 [마블 다이어그램](http://reactivex.io/documentation/operators/retry.html)이 있습니다.

그런데 이 목록에 없는 연산자가 필요하다면 어떻게 할까요? 여러분이 직접 연산자를 만들 수 있습니다.

만약에 어떤 이유로 연산자를 만들기 굉장히 어렵거나, 상태 정보를 가지는 레거시 코드 조각으로 작업해야한다면 어떻게 할까요? 조금 지저분할 수 있지만 [간단히 잠시 Rx의 세계를 벗어나서](https://github.com/ReactiveX/RxSwift/blob/master/Documentation/GettingStarted.md#life-happens), 데이터를 처리하고, 다시 돌아오면 됩니다.
