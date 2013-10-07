(begin

	(define id (lambda (x) x))
	(define f (lambda (n)
							(if (<= n 1)
									1
									(* n (f (- n 1))))))
	(define g (lambda (n)
							(if (<= n 1)
									1
									(+ (* n n) (g (- n 1))))))
	(+ ((id f) 3) ((id g) 4))

)