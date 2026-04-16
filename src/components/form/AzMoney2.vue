<template>
    <v-text-field
        ref="azSimpleMoney"
        v-model.lazy="formattedValue"
        v-validate="getValidator"
        :name="name"
        :label="label"
        :disabled="disabled"
        :readonly="readonly"
        :required="required"
        :placeholder="placeholder"
        :clearable="showClearButton"
        :error-messages="errors.collect(getFieldName)"
        :dense="dense"
        @click:clear="cleanValue"
        @blur="handleBlur($event)"
        @change="handleChange($event)"
        @focus="handleFocus($event)"
        @input="handleInput($event)"
        @keydown="checkKeydown($event)"
        @keyup="checkKeyup($event)"
    >
        <template v-slot:label v-if="$slots['label']">
            <slot name="label" />
        </template>
        <template v-slot:append-outer v-if="$slots['append-outer']">
            <slot name="append-outer" />
        </template>
        <template v-slot:append v-if="$slots['append']">
            <slot name="append" />
        </template>
    </v-text-field>
</template>

<script>
import accounting from 'accounting'

export default {
    inject: ['$validator'],
    props: {
        dense: {
            type: Boolean,
        },
        disabled: {
            type: Boolean,
        },
        eventSubmit: {
            type: String,
            default: null,
        },
        label: {
            type: String,
            default: '',
        },
        maxLength: {
            type: Number,
            default: 15,
        },
        name: {
            type: String,
            default: '',
        },
        negative: {
            type: Boolean,
        },
        placeholder: {
            type: String,
            default: '',
        },
        precision: {
            type: Number,
            default: 2,
        },
        prefix: {
            type: String,
            default: 'R$ ',
        },
        readonly: {
            type: Boolean,
        },
        required: {
            type: Boolean,
        },
        showClearButton: {
            type: Boolean,
        },
        suffix: {
            type: String,
            default: '',
        },
        validate: {
            type: Object,
            default() {
                return {}
            },
        },
        validateLength: {
            type: Boolean,
        },
        value: {
            type: Number,
            default: null,
        },
    },
    data() {
        return {
            clickedField: false,
            formattedValue: null,
            isFocused: false,
        }
    },
    computed: {
        getFieldName() {
            return this.$attrs['data-vv-scope'] ? `${this.$attrs['data-vv-scope']}.${this.name}` : this.name
        },
        getValidator() {
            return {
                required: this.required,
                ...this.validate,
                ...this.checkMaxLength(),
            }
        },
    },
    watch: {
        value(newValue) {
            this.setFormattedValue(newValue)
        },
        precision() {
            this.setFormattedValue(this.getNumberValue(), true)
        },
        prefix() {
            this.setFormattedValue(this.getNumberValue(), true)
        },
        suffix() {
            this.setFormattedValue(this.getNumberValue(), true)
        },
    },
    mounted() {
        this.createRules()
        this.setFormattedValue(this.value, true)
    },
    methods: {
        normalizeEditableValue(value) {
            if (!value) {
                return ''
            }

            const parts = String(value).split(',')
            const integerPart = parts.shift()
            const fractionalPart = parts.join('')

            if (this.precision <= 0) {
                return integerPart
            }

            return fractionalPart ? `${integerPart},${fractionalPart.substring(0, this.precision)}` : integerPart
        },
        canInsertDigitAtCurrentCursor() {
            if (this.precision <= 0) {
                return true
            }

            const input = this.getInput()
            if (!input) {
                return true
            }

            const value = input.value || ''
            const commaIndex = value.indexOf(',')
            if (commaIndex < 0) {
                return true
            }

            const selectionStart = input.selectionStart || 0
            const selectionEnd = input.selectionEnd || 0
            if (selectionEnd > selectionStart) {
                return true
            }

            if (selectionStart <= commaIndex) {
                return true
            }

            const fractionalLength = value.substring(commaIndex + 1).replace(/[^\d]/g, '').length
            return fractionalLength < this.precision
        },
        isAllowedControlKey(event) {
            const allowedKeys = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Enter', 'Escape']
            if (allowedKeys.includes(event.key)) {
                return true
            }

            return (event.ctrlKey || event.metaKey) && ['a', 'c', 'v', 'x', 'z', 'y'].includes(event.key.toLowerCase())
        },
        sanitizeInputValue(value) {
            let sanitized = String(value || '').replace(/[^\d.,-]/g, '')
            if (!this.negative) {
                sanitized = sanitized.replace(/-/g, '')
            } else {
                const hasLeadingNegative = sanitized.trim().startsWith('-')
                sanitized = sanitized.replace(/-/g, '')
                sanitized = hasLeadingNegative ? `-${sanitized}` : sanitized
            }

            const hasLeadingNegative = sanitized.startsWith('-')
            const unsigned = hasLeadingNegative ? sanitized.slice(1) : sanitized
            const normalizedUnsigned = this.normalizeEditableValue(unsigned)

            return hasLeadingNegative ? `-${normalizedUnsigned}` : normalizedUnsigned
        },
        getInput() {
            if (!this.$refs.azSimpleMoney || !this.$refs.azSimpleMoney.$el) {
                return null
            }

            return this.$refs.azSimpleMoney.$el.querySelector('input')
        },
        setInputValue(value) {
            const input = this.getInput()
            if (input) {
                input.value = value || ''
            }
        },
        syncFormattedValue(event) {
            const target = event && event.target ? event.target : this.getInput()
            this.formattedValue = target ? target.value : this.formattedValue
        },
        checkKeydown(event) {
            if (this.isAllowedControlKey(event)) {
                return
            }

            if (event.key === '-') {
                if (!this.negative) {
                    event.preventDefault()
                    return
                }

                const input = this.getInput()
                if (!input) {
                    return
                }

                const hasMinus = input.value.includes('-')
                const isReplacingAll = input.selectionStart === 0 && input.selectionEnd === input.value.length
                const isAtStart = input.selectionStart === 0

                if ((hasMinus && !isReplacingAll) || !isAtStart) {
                    event.preventDefault()
                }
                return
            }

            if (event.key === ',') {
                if (this.precision <= 0) {
                    event.preventDefault()
                    return
                }

                const input = this.getInput()
                if (!input) {
                    return
                }

                const value = input.value || ''
                const hasComma = value.includes(',')
                const selectionStart = input.selectionStart || 0
                const selectionEnd = input.selectionEnd || 0
                const selectedText = value.substring(selectionStart, selectionEnd)

                if (hasComma && selectedText.indexOf(',') < 0) {
                    event.preventDefault()
                }
                return
            }

            if (/\d/.test(event.key) && !this.canInsertDigitAtCurrentCursor()) {
                event.preventDefault()
                return
            }

            if (!/[\d.,]/.test(event.key)) {
                event.preventDefault()
            }
        },
        async checkKeyup(event) {
            if (event.key === 'Tab' || this.readonly) {
                return
            }

            this.clickedField = true
            this.syncFormattedValue(event)
            if (event.key === 'Enter') {
                await this.updateValue('keyupEnter')
            } else if (event.key === 'Escape') {
                await this.updateValue('keyupEsc')
            } else if (event.key === 'Backspace') {
                await this.removeNegativeZero()
            } else {
                await this.updateValue('keyup')
            }
        },
        checkMaxLength() {
            if (this.validateLength) {
                return {
                    digits: this.maxLength,
                }
            }

            return {}
        },
        cleanValue() {
            this.formattedValue = null
            this.clickedField = false

            this.$emit('input', null)
            if (this.eventSubmit) {
                this.$emit(this.eventSubmit, null)
            }
        },
        createRules() {
            this.createRuleDigits()
        },
        createRuleDigits() {
            this.$validator.extend('digits', {
                validate(value, args) {
                    if (!value || !args.digits) {
                        return true
                    }

                    const digits = String(value).replace(/\D/g, '')
                    return digits.length <= args.digits
                },
                getMessage: (field, params) => 'O campo permite no máximo ' + params[0] + ' dígito(s)',
                paramNames: ['digits'],
            })
        },
        getRawInput(value) {
            let raw = String(value || '').trim()

            if (this.prefix) {
                raw = raw.replace(this.prefix, '')
            }
            if (this.suffix) {
                raw = raw.replace(this.suffix, '')
            }

            return raw.replace(/\s+/g, '')
        },
        normalizeNumber(value) {
            if (value === null || value === undefined || value === '') {
                return null
            }

            const numeric = Number(value)
            if (Number.isNaN(numeric)) {
                return null
            }

            return Number(numeric.toFixed(this.precision))
        },
        parseDisplayValue(value) {
            const raw = this.getRawInput(value)
            if (!raw || raw === '-' || raw === ',' || raw === '.') {
                return null
            }

            let working = raw.replace(/[^\d,-]/g, '')
            const isNegative = working.indexOf('-') === 0
            working = working.replace(/-/g, '')

            const lastComma = working.lastIndexOf(',')

            let integerPart = working
            let fractionalPart = ''
            if (lastComma >= 0) {
                integerPart = working.substring(0, lastComma)
                fractionalPart = working.substring(lastComma + 1)
            }

            integerPart = integerPart.replace(/[^\d]/g, '')
            fractionalPart = fractionalPart.replace(/[^\d]/g, '')

            let normalized = integerPart || '0'
            if (fractionalPart) {
                normalized += `.${fractionalPart}`
            }

            if (isNegative && this.negative) {
                normalized = `-${normalized}`
            }

            return this.normalizeNumber(normalized)
        },
        getNumberValue() {
            return this.parseDisplayValue(this.formattedValue)
        },
        formatMasked(value) {
            if (value === null || value === undefined || value === '') {
                return null
            }

            const formatted = accounting.formatMoney(value, '', this.precision, '.', ',')
            return `${this.prefix || ''}${formatted}${this.suffix || ''}`
        },
        toEditableValue(value) {
            if (value === null || value === undefined) {
                return null
            }

            return String(value).replace('.', ',')
        },
        setFormattedValue(value, forceUpdate = false) {
            const normalizedValue = this.normalizeNumber(value)
            if (this.isFocused && !forceUpdate) {
                return
            }

            const numberValue = this.getNumberValue()
            if (normalizedValue !== numberValue || forceUpdate) {
                if (this.isFocused) {
                    this.formattedValue = this.toEditableValue(normalizedValue)
                } else {
                    this.formattedValue = this.formatMasked(normalizedValue)
                }

                this.setInputValue(this.formattedValue)
            }
        },
        handleFocus(event) {
            this.isFocused = true
            const numberValue = this.getNumberValue()
            this.formattedValue = this.toEditableValue(numberValue)
            this.setInputValue(this.formattedValue)
            this.$emit('focus', event)
        },
        handleInput(event) {
            if (this.readonly) {
                return
            }

            this.clickedField = true
            this.syncFormattedValue(event)
            const sanitizedValue = this.sanitizeInputValue(this.formattedValue)
            if (sanitizedValue !== this.formattedValue) {
                this.formattedValue = sanitizedValue
                this.setInputValue(this.formattedValue)
            }
        },
        async handleBlur(event) {
            this.syncFormattedValue(event)
            const numberValue = this.getNumberValue()
            this.isFocused = false
            this.setFormattedValue(numberValue, true)
            await this.updateValue('blur')
        },
        async handleChange(event) {
            this.syncFormattedValue(event)
            await this.updateValue('change')
        },
        validateNegative(event) {
            if (event.key === '-' && !this.negative) {
                event.preventDefault()
            }
        },
        async updateSign() {
            await this.$nextTick()
            const numberValue = this.getNumberValue()

            if (numberValue !== null && numberValue <= 0) {
                this.setFormattedValue(numberValue * -1, true)
            }
            await this.updateValue('keyup')
        },
        async removeNegativeZero() {
            await this.$nextTick()
            const numberValue = this.getNumberValue()

            if (Object.is(numberValue, -0)) {
                this.setFormattedValue(0, true)
            }
            await this.updateValue('keyup')
        },
        async updateValue(event) {
            await this.$nextTick()
            const numberValue = this.getNumberValue()
            const shouldUpdate = this.clickedField || ['keyupEnter', 'keyupEsc', 'blur', 'change'].includes(event)

            if (shouldUpdate) {
                if (numberValue !== this.value) {
                    this.$emit('input', numberValue)
                }

                if (!this.eventSubmit || this.eventSubmit === event) {
                    this.$emit(event, numberValue)
                    this.clickedField = false
                }
            }
        },
    },
}
</script>
