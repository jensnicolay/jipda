// function chain(f)
// {
//     function forEach(valueStores, states)
//     {
//         return function (f)
//         {
//             const valueStores2 = new Set();
//             for (const vs of valueStores)
//             {
//                 f(vs.value, vs.store, vs2 => valueStores2.add(vs2), s => states.add(s), err => {throw new Error(err)});            
//             }
//             return {forEach:forEach(valueStores2, states), states: () => states};
//         }
//     }
    
//     const states = new Set();
//     const valueStores = new Set();
//     f(vs => valueStores.add(vs), s => states.add(s), err => {throw new Error(err)});
//     return {forEach:forEach(valueStores, states), states: () => states};
// }

// function chainThreadStore(f)
// {
//     function forEach(valueStores, states)
//     {
//         return function (f)
//         {
//             const valueStores2 = new Set();
//             for (const vs of valueStores)
//             {
//                 f(vs.value, vs.store, vs2 => valueStores2.add(vs2), s => states.add(s), err => {throw new Error(err)});            
//             }
//             return {forEach:forEach(valueStores2, states), states: () => states};
//         }
//     }
    
//     const states = new Set();
//     const valueStores = new Set();
//     f(vs => valueStores.add(vs), s => states.add(s), err => {throw new Error(err)});
//     return {forEach:forEach(valueStores, states), states: () => states};
// }

// function f1(cont, state, reject)
// {
//     cont({value:'f1-1',store:'11'});
//     cont({value:'f1-2',store:'22'});
//     state('a');
//     cont({value:'f1-3',store:'33'});
// }

// function f2(value, store, cont, state, reject)
// {
//     cont({value:value + 'f2-1' ,store:store+"44"});
//     state('b' + store);
//     cont({value:value + 'f2-2', store:store+"55"});
// }



// const ss = chain(f1)
//     .forEach(f2)
//     .forEach((value, store, cont, state) => state('c' + store))
//     .states();


// console.log(ss);


const xx = [{x:1,y:2}, {x:3,y:4}];

for (const {x,y} of xx)
{
    console.log(x + " " + y)
}