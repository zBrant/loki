import StringMask from 'string-mask'

const filter = (cpfCnpj) => {
    if (!cpfCnpj) {
        return 'Não informado'
    }
    if (cpfCnpj.length < 12) {
        return new StringMask('###.###.###-##').apply(cpfCnpj)
    } else {
        return new StringMask('AA.AAA.AAA/AAAA-##').apply(cpfCnpj)
    }
}

export default filter
