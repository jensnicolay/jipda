(define (debug-trace) 
  'do-nothing)

; Utilities
(define (cadr p) (car (cdr p)))
(define (caddr p) (car (cdr (cdr p))))

;; Special regular expressions.
(define regex-NULL #f)
(define regex-BLANK #t)

;; Predicates.
(define (regex-alt? re)
  (and (pair? re) (eq? (car re) 'alt)))

(define (regex-seq? re)
  (and (pair? re) (eq? (car re) 'seq)))

(define (regex-rep? re)
  (and (pair? re) (eq? (car re) 'rep)))

(define (regex-null? re)
  (eq? re #f))

(define (regex-empty? re)
  (eq? re #t))

(define (regex-atom? re)
  (or (char? re) (symbol? re)))

;; Regex deconstructors.
(define (match-seq re f)
  (and (regex-seq? re)
       (f (cadr re) (caddr re))))

(define (match-alt re f)
  (and (regex-alt? re)
       (f (cadr re) (caddr re))))

(define (match-rep re f)
  (and (regex-rep? re)
       (f (cadr re))))


;; Simplifying regex constructors.
(define (seq pat1 pat2)
  (cond
    ((regex-null? pat1) regex-NULL)
    ((regex-null? pat2) regex-NULL)
    ((regex-empty? pat1) pat2)
    ((regex-empty? pat2) pat1)
    (else (cons 'seq (cons pat1 (cons pat2 '()))))))
     
(define (alt pat1 pat2)
  (cond
    ((regex-null? pat1) pat2)
    ((regex-null? pat2) pat1)
    (else (cons 'alt (cons pat1 (cons pat2 '()))))))

(define (rep pat)
  (cond
    ((regex-null? pat) regex-BLANK)
    ((regex-empty? pat) regex-BLANK)
    (else (cons 'rep (cons pat '())))))

;; Matching functions.

; regex-empty : regex -> boolean
(define (regex-empty re)
  (cond
    ((regex-empty? re) #t)
    ((regex-null? re) #f)
    ((regex-atom? re) #f)
    ((match-seq re (lambda (pat1 pat2)
                     (seq (regex-empty pat1) (regex-empty pat2)))))
    ((match-alt re (lambda (pat1 pat2)
                     (alt (regex-empty pat1) (regex-empty pat2)))))
    ((regex-rep? re) #t)
    (else #f)))

; regex-deritvative : regex regex-atom -> regex
(define (regex-derivative re c)
  (debug-trace)
  (cond 
    ((regex-empty? re) regex-NULL)
    ((regex-null? re)  regex-NULL)
    ((eq? c re)        regex-BLANK)
    ((regex-atom? re)  regex-NULL)
    ((match-seq re     (lambda (pat1 pat2) 
                         (alt (seq (d/dc pat1 c) pat2)
                              (seq (regex-empty pat1) (d/dc pat2 c))))))
    ((match-alt re     (lambda (pat1 pat2)
                         (alt (d/dc pat1 c) (d/dc pat2 c)))))
    ((match-rep re     (lambda (pat)
                         (seq (d/dc pat c) (rep pat)))))
    (else regex-NULL)
    ))
                
; d/dc = regex-derivative
(define d/dc regex-derivative)

; regex-match : regex list -> boolean 
(define (regex-match pattern data)
  (if (null? data)
      (regex-empty? (regex-empty pattern))
      (regex-match (d/dc pattern (car data)) (cdr data))))

;; Tests.
(define (check-expect check expect)
  (equal? check expect))

;; Used for JFP results
(check-expect (regex-match '(seq foo (rep bar))
                           '(foo bar))
              #t)
