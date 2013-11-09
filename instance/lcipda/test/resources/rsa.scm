(letrec ((extended-gcd (lambda (a b)
                         (if (= (modulo a b) 0)
                             (cons 0 1)
                             (let ((x:y (extended-gcd b (modulo a b))))
                               (let ((x (car x:y)))
                                 (let ((y (cdr x:y)))
                                   (cons y (- x (* y (quotient a b)))))))))))
; modulo-inverse(a,n) = b, such that a*b = 1 [mod n].
  (let ((modulo-inverse (lambda (a n)
                          (modulo (car (extended-gcd a n)) n))))
; totient(n) = (p - 1)*(q - 1), 
;  where pq is the prime factorization of n.
    (let ((totient (lambda (p q) (* (- p 1) (- q 1)))))
; square(x) = x^2
      (let ((square (lambda (x) (* x x))))
; modulo-power(base,exp,n) = base^exp [mod n]
        (letrec ((modulo-power (lambda (base exp n)
                              (if (= exp 0)
                                  1
                                  (if (odd? exp)
                                      (modulo (* base (modulo-power base (- exp 1) n)) n)
                                      (modulo (square (modulo-power base (/ exp 2) n)) n))))))
;; RSA routines.
; A legal public exponent e is between
;  1 and totient(n), and gcd(e,totient(n)) = 1
          (let ((is-legal-public-exponent? (lambda (e p q)
                                             (and (< 1 e) 
                                                  (and (< e (totient p q))
                                                       (= 1 (gcd e (totient p q))))))))
; The private exponent is the inverse of the public exponent, mod n.
            (let ((private-exponent (lambda (e p q)
                                      (if (is-legal-public-exponent? e p q)
                                          (modulo-inverse e (totient p q))
                                          (error "Not a legal public exponent for that modulus.")))))
; An encrypted message is c = m^e [mod n].
              (let ((encrypt (lambda (m e n)
                               (if (> m n)
                                   (error "The modulus is too small to encrypt the message.")
                                   (modulo-power m e n)))))
; A decrypted message is m = c^d [mod n].
                (let ((decrypt (lambda (c d n)
                                 (modulo-power c d n))))
;; RSA example.
                  (let ((p 41))       ; A "large" prime.
                    (let ((q 47))       ; Another "large" prime.
                      (let ((n (* p q)))  ; The public modulus.
                        (let ((e 7))                        ; The public exponent.
                          (let ((d (private-exponent e p q))) ; The private exponent.
                            (let ((plaintext  42))
                              (let ((ciphertext (encrypt plaintext e n))) 
                                (let ((decrypted-ciphertext (decrypt ciphertext d n)))
                                  (if (not (= plaintext decrypted-ciphertext))
                                      (error "RSA fail!")
                                      #t))))))))))))))))))