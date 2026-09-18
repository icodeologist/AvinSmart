package api

type Fields map[string][]string

func NewFields() Fields {
	return Fields{}
}

func (f Fields) Add(field, message string) {
	f[field] = append(f[field], message)
}

func (f Fields) HasErrors() bool {
	return len(f) > 0
}

func (f Fields) Count() int {
	count := 0
	for _, messages := range f {
		count += len(messages)
	}
	return count
}
