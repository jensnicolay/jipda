var array1 = ["Vijendra","Singh"];
var array2 = ["Singh", "Shakya"];

function arrayUnique(a, b)
{
    const s = [];
    for (const y of b)
    {
        s.add(y);
    }
    return Array.from(s);
}

console.log(arrayUnique([], []));