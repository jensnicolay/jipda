(let
    ((square (lambda (x) (* x x))))
  (letrec
      ; modulo-power: a fast modular exponentiation routine.
      ; modulo-power(base,exp,n) = base^exp [mod n]
      ((modulo-power (lambda (base exp n)
                       (if (= exp 0)
                           1
                           (if (odd? exp)
                               (modulo (* base (modulo-power base (- exp 1) n)) n)
                               (modulo (square (modulo-power base (/ exp 2) n)) n))))))
;; Primality tests.
; is-trivial-composite?: divisibility tests with the first few primes.
    (let ((is-trivial-composite? (lambda (n)
                                   (or (= (modulo n 2) 0)
                                       (or (= (modulo n 3) 0)
                                           (or (= (modulo n 5) 0)
                                               (or (= (modulo n 7) 0)
                                                   (or (= (modulo n 11) 0)
                                                       (or (= (modulo n 13) 0)
                                                           (or (= (modulo n 17) 0)
                                                               (or (= (modulo n 19) 0)
                                                                   (= (modulo n 23) 0))))))))))))
; is-fermat-prime?:
; Check, for many values of a:
;  a^(n-1) = 1 [mod n] ?  
;   If yes, could be prime.  
;   If no, then composite.
; Warning: Some Carmichael numbers (though rare) defeat this test.
      (letrec ((is-fermat-prime? (lambda (n iterations)
                                   (or (<= iterations 0)
                                       (let ((byte-size (ceiling (/ (log n) (log 2)))))
                                         (let ((a (random byte-size)))
                                           (if (= (modulo-power a (- n 1) n) 1)
                                               (is-fermat-prime? n (- iterations 1))
                                               #f)))))))
;; Prime generation.
; generate-fermat-prime(byte-size) yields a prime satisfying the Fermat test.
        (letrec ((generate-fermat-prime (lambda (byte-size iterations)
                                          (let ((n (random byte-size)))
                                            (if
                                             (and (not (is-trivial-composite? n)) (is-fermat-prime? n iterations))
                                             n
                                             (generate-fermat-prime byte-size iterations))))))
;; Example
          (let ((iterations 10))
            (let ((byte-size 15))
              (generate-fermat-prime byte-size iterations))))))))